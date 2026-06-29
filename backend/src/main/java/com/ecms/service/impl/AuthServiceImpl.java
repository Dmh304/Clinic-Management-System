// Mạnh Hùng - HE200743
// Triển khai các nghiệp vụ xác thực: đăng ký + xác minh email, đăng nhập bệnh nhân/nhân viên (2FA qua OTP với nhân viên),
// quên/đặt lại mật khẩu, đổi mật khẩu qua OTP, khóa/mở khóa tài khoản theo chính sách đăng nhập sai nhiều lần.
package com.ecms.service.impl;

import com.google.api.client.googleapis.auth.oauth2.GoogleIdToken;
import com.google.api.client.googleapis.auth.oauth2.GoogleIdTokenVerifier;
import com.google.api.client.http.javanet.NetHttpTransport;
import com.google.api.client.json.gson.GsonFactory;
import com.ecms.dto.request.*;
import com.ecms.dto.response.AuthResponse;
import com.ecms.entity.AuthProvider;
import com.ecms.entity.Doctor;
import com.ecms.entity.Patient;
import com.ecms.entity.Role;
import com.ecms.entity.User;
import com.ecms.entity.UserStatus;
import com.ecms.entity.VerificationTokenType;
import com.ecms.exception.ResourceNotFoundException;
import com.ecms.exception.UnauthorizedException;
import com.ecms.repository.DoctorRepository;
import com.ecms.repository.PatientRepository;
import com.ecms.repository.RoleRepository;
import com.ecms.repository.UserRepository;
import com.ecms.security.JwtUtil;
import com.ecms.service.AuthService;
import com.ecms.service.EmailService;
import com.ecms.service.VerificationTokenService;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Collections;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;

@Service
@RequiredArgsConstructor
public class AuthServiceImpl implements AuthService {

    private static final int MAX_FAILED_ATTEMPTS = 5;
    private static final long LOCK_MINUTES_PATIENT = 30;
    private static final String GENERIC_LOGIN_ERROR = "Email/số điện thoại hoặc mật khẩu không đúng, hoặc tài khoản đang bị tạm khóa";

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final DoctorRepository doctorRepository;
    private final PatientRepository patientRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;
    private final EmailService emailService;
    private final VerificationTokenService verificationTokenService;

    @Value("${google.oauth.client-id}")
    private String googleClientId;

    @Value("${app.frontend-base-url}")
    private String frontendBaseUrl;

    // Lưu tạm mật khẩu mới (đã mã hóa) đang chờ xác nhận OTP trong luồng đổi mật khẩu
    private final ConcurrentHashMap<Long, String> pendingPasswordChanges = new ConcurrentHashMap<>();

    // Đăng ký tài khoản: tạo User ở trạng thái PENDING_VERIFICATION và gửi email xác minh
    @Override
    @Transactional
    public void register(RegisterRequest request) {
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new IllegalArgumentException("Email đã được sử dụng");
        }

        Role patientRole = roleRepository.findByName("PATIENT")
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy vai trò PATIENT"));

        User user = User.builder()
                .fullName(request.getFullName())
                .email(request.getEmail())
                .phone(request.getPhone())
                .passwordHash(passwordEncoder.encode(request.getPassword()))
                .role(patientRole)
                .authProvider(AuthProvider.LOCAL)
                .status(UserStatus.PENDING_VERIFICATION)
                .build();
        userRepository.save(user);

        sendVerificationEmail(user);
    }

    // Xác minh email: kiểm tra token hợp lệ, kích hoạt tài khoản
    @Override
    @Transactional
    public void verifyEmail(String token) {
        User user = verificationTokenService.consumeEmailVerifyToken(token);
        user.setStatus(UserStatus.ACTIVE);
        userRepository.save(user);
    }

    // Gửi lại email xác minh cho tài khoản chưa kích hoạt
    @Override
    @Transactional
    public void resendVerification(ResendVerificationRequest request) {
        User user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy tài khoản với email này"));

        if (user.getStatus() != UserStatus.PENDING_VERIFICATION) {
            throw new IllegalArgumentException("Tài khoản này đã được xác minh");
        }

        sendVerificationEmail(user);
    }

    // Đăng nhập bệnh nhân bằng email hoặc số điện thoại; chặn nếu chưa xác minh, bị khóa, hoặc không phải PATIENT
    @Override
    @Transactional
    public AuthResponse login(LoginRequest request) {
        User user = findByEmailOrPhone(request.getEmail())
                .orElseThrow(() -> new UnauthorizedException(GENERIC_LOGIN_ERROR));

        if (user.getRole() == null || !"PATIENT".equals(user.getRole().getName())) {
            throw new UnauthorizedException("Vui lòng đăng nhập bằng cổng nhân viên");
        }

        ensureNotLocked(user, false);

        if (user.getPasswordHash() == null) {
            throw new UnauthorizedException(
                    "Tài khoản này đang đăng nhập bằng Google. Vui lòng dùng nút \"Đăng nhập với Google\", " +
                    "hoặc đặt mật khẩu trong phần Cài đặt tài khoản.");
        }

        if (!passwordEncoder.matches(request.getPassword(), user.getPasswordHash())) {
            registerFailedAttempt(user, false);
            throw new UnauthorizedException(GENERIC_LOGIN_ERROR);
        }

        if (user.getStatus() == UserStatus.PENDING_VERIFICATION) {
            throw new UnauthorizedException("Tài khoản chưa được xác minh email. Vui lòng kiểm tra hộp thư của bạn");
        }
        if (user.getStatus() != UserStatus.ACTIVE) {
            throw new UnauthorizedException(GENERIC_LOGIN_ERROR);
        }

        registerSuccessfulLogin(user);
        return buildAuthResponse(user);
    }

    // Đăng nhập bằng Google: xác minh ID token, tìm tài khoản theo email — nếu chưa có thì tạo mới với vai trò PATIENT
    @Override
    @Transactional
    public AuthResponse loginWithGoogle(GoogleLoginRequest request) {
        GoogleIdToken.Payload payload = verifyGoogleIdToken(request.getIdToken());
        String email = payload.getEmail();
        String fullName = (String) payload.get("name");

        User user = userRepository.findByEmail(email).orElse(null);

        if (user == null) {
            Role patientRole = roleRepository.findByName("PATIENT")
                    .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy vai trò PATIENT"));

            user = User.builder()
                    .fullName(fullName != null && !fullName.isBlank() ? fullName : email)
                    .email(email)
                    .passwordHash(null)
                    .role(patientRole)
                    .authProvider(AuthProvider.GOOGLE)
                    .status(UserStatus.ACTIVE)
                    .build();
            userRepository.save(user);
        }

        if (user.getRole() == null) {
            throw new UnauthorizedException("Tài khoản chưa được gán vai trò");
        }

        if (!"PATIENT".equals(user.getRole().getName())) {
            throw new UnauthorizedException("Tài khoản này là nhân viên hệ thống. Vui lòng đăng nhập qua cổng nhân viên");
        }

        if (user.getStatus() != UserStatus.ACTIVE) {
            throw new UnauthorizedException("Tài khoản đã bị vô hiệu hóa. Vui lòng liên hệ quản trị viên");
        }

        return buildAuthResponse(user);
    }

    // Bước 1 đăng nhập nhân viên: xác thực email/mật khẩu, áp dụng chính sách khóa tài khoản, gửi OTP nếu hợp lệ
    @Override
    @Transactional
    public void staffLogin(StaffLoginRequest request) {
        User user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new UnauthorizedException(GENERIC_LOGIN_ERROR));

        if (user.getRole() == null || "PATIENT".equals(user.getRole().getName())) {
            throw new UnauthorizedException("Vui lòng đăng nhập bằng cổng bệnh nhân");
        }

        ensureNotLocked(user, true);

        if (user.getPasswordHash() == null || !passwordEncoder.matches(request.getPassword(), user.getPasswordHash())) {
            registerFailedAttempt(user, true);
            throw new UnauthorizedException(GENERIC_LOGIN_ERROR);
        }

        if (user.getStatus() != UserStatus.ACTIVE) {
            throw new UnauthorizedException(GENERIC_LOGIN_ERROR);
        }

        registerSuccessfulLogin(user);

        String otp = verificationTokenService.issueOtp(user, VerificationTokenType.LOGIN_OTP);
        emailService.sendLoginOtp(user.getEmail(), user.getFullName(), otp);
    }

    // Bước 2 đăng nhập nhân viên: xác minh OTP rồi cấp JWT
    @Override
    @Transactional
    public AuthResponse staffVerifyOtp(StaffVerifyOtpRequest request) {
        User user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new UnauthorizedException("Email hoặc mã OTP không đúng"));

        verificationTokenService.consumeOtp(user, request.getOtp(), VerificationTokenType.LOGIN_OTP);

        return buildAuthResponse(user);
    }

    // Quên mật khẩu: luôn trả lời giống nhau dù email có tồn tại hay không, để tránh dò email
    @Override
    @Transactional
    public void forgotPassword(ForgotPasswordRequest request) {
        Optional<User> userOpt = userRepository.findByEmail(request.getEmail());
        if (userOpt.isEmpty()) {
            return;
        }

        User user = userOpt.get();
        if (user.getAuthProvider() == AuthProvider.GOOGLE) {
            emailService.sendGoogleAccountNotice(user.getEmail(), user.getFullName());
            return;
        }

        String rawToken = verificationTokenService.issuePasswordResetToken(user);
        String resetLink = frontendBaseUrl + "/reset-password?token=" + rawToken;
        emailService.sendPasswordResetEmail(user.getEmail(), user.getFullName(), resetLink);
    }

    // Đặt lại mật khẩu bằng token nhận qua email
    @Override
    @Transactional
    public void resetPassword(ResetPasswordRequest request) {
        if (!request.getNewPassword().equals(request.getConfirmPassword())) {
            throw new IllegalArgumentException("Mật khẩu mới và xác nhận mật khẩu không khớp");
        }

        User user = verificationTokenService.consumePasswordResetToken(request.getToken());

        if (user.getAuthProvider() == AuthProvider.GOOGLE) {
            throw new IllegalArgumentException("Tài khoản này đăng nhập bằng Google, không thể đặt lại mật khẩu");
        }

        user.setPasswordHash(passwordEncoder.encode(request.getNewPassword()));
        user.setFailedLoginAttempts(0);
        user.setLockUntil(null);
        userRepository.save(user);
    }

    // Bước 1 đổi mật khẩu (đã đăng nhập): xác minh mật khẩu hiện tại, lưu tạm mật khẩu mới và gửi OTP xác nhận
    @Override
    @Transactional
    public void changePassword(String email, ChangePasswordRequest request) {
        if (!request.getNewPassword().equals(request.getConfirmPassword())) {
            throw new IllegalArgumentException("Mật khẩu mới và xác nhận mật khẩu không khớp");
        }

        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("Người dùng không tồn tại"));

        if (user.getPasswordHash() == null || !passwordEncoder.matches(request.getCurrentPassword(), user.getPasswordHash())) {
            throw new IllegalArgumentException("Mật khẩu hiện tại không đúng");
        }

        pendingPasswordChanges.put(user.getId(), passwordEncoder.encode(request.getNewPassword()));

        String otp = verificationTokenService.issueOtp(user, VerificationTokenType.CHANGE_PASSWORD_OTP);
        emailService.sendChangePasswordOtp(user.getEmail(), user.getFullName(), otp);
    }

    // Bước 2 đổi mật khẩu: xác minh OTP rồi áp dụng mật khẩu mới đã lưu tạm
    @Override
    @Transactional
    public void verifyChangePasswordOtp(String email, VerifyChangePasswordOtpRequest request) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("Người dùng không tồn tại"));

        verificationTokenService.consumeOtp(user, request.getOtp(), VerificationTokenType.CHANGE_PASSWORD_OTP);

        String newPasswordHash = pendingPasswordChanges.remove(user.getId());
        if (newPasswordHash == null) {
            throw new IllegalStateException("Không tìm thấy yêu cầu đổi mật khẩu đang chờ xác nhận");
        }

        user.setPasswordHash(newPasswordHash);
        userRepository.save(user);
    }

    // Mở khóa tài khoản nhân viên: chỉ ADMIN được gọi (đã chặn ở SecurityConfig)
    @Override
    @Transactional
    public void adminUnlockUser(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy người dùng"));

        user.setStatus(UserStatus.ACTIVE);
        user.setFailedLoginAttempts(0);
        user.setLockUntil(null);
        userRepository.save(user);
    }

    // ───────────────────────────── Helpers ─────────────────────────────

    private void sendVerificationEmail(User user) {
        String rawToken = verificationTokenService.issueEmailVerifyToken(user);
        String verifyLink = frontendBaseUrl + "/verify-email?token=" + rawToken;
        emailService.sendVerifyEmail(user.getEmail(), user.getFullName(), verifyLink);
    }

    private Optional<User> findByEmailOrPhone(String identifier) {
        Optional<User> byEmail = userRepository.findByEmail(identifier);
        if (byEmail.isPresent()) {
            return byEmail;
        }
        return userRepository.findByPhone(identifier);
    }

    // Kiểm tra trạng thái khóa: bệnh nhân tự động mở khóa sau thời hạn, nhân viên cần admin mở khóa
    private void ensureNotLocked(User user, boolean isStaff) {
        if (user.getStatus() != UserStatus.LOCKED) {
            return;
        }

        if (!isStaff && user.getLockUntil() != null && LocalDateTime.now().isAfter(user.getLockUntil())) {
            user.setStatus(UserStatus.ACTIVE);
            user.setFailedLoginAttempts(0);
            user.setLockUntil(null);
            userRepository.save(user);
            return;
        }

        throw new UnauthorizedException(GENERIC_LOGIN_ERROR);
    }

    // Ghi nhận đăng nhập sai: khóa tài khoản sau 5 lần liên tiếp theo chính sách BR-02
    private void registerFailedAttempt(User user, boolean isStaff) {
        int attempts = user.getFailedLoginAttempts() + 1;
        user.setFailedLoginAttempts(attempts);

        if (attempts >= MAX_FAILED_ATTEMPTS) {
            user.setStatus(UserStatus.LOCKED);
            user.setLockUntil(isStaff ? null : LocalDateTime.now().plusMinutes(LOCK_MINUTES_PATIENT));
        }

        userRepository.save(user);
    }

    private void registerSuccessfulLogin(User user) {
        user.setFailedLoginAttempts(0);
        user.setLockUntil(null);
        userRepository.save(user);
    }

    private AuthResponse buildAuthResponse(User user) {
        String roleName = user.getRole().getName();

        Long doctorId = null;
        Long patientId = null;
        if ("DOCTOR".equals(roleName)) {
            doctorId = doctorRepository.findByUserId(user.getId()).map(Doctor::getId).orElse(null);
        } else if ("PATIENT".equals(roleName)) {
            patientId = patientRepository.findByUserId(user.getId()).map(Patient::getId).orElse(null);
        }

        String token = jwtUtil.generateToken(user.getEmail(), roleName, doctorId, user.getTokenVersion());

        return AuthResponse.builder()
                .token(token)
                .tokenType("Bearer")
                .userId(user.getId())
                .email(user.getEmail())
                .fullName(user.getFullName())
                .role(roleName)
                .doctorId(doctorId)
                .patientId(patientId)
                .build();
    }

    // Xác minh ID token do Google cấp: kiểm tra chữ ký, hạn sử dụng và audience (Client ID) khớp với hệ thống
    private GoogleIdToken.Payload verifyGoogleIdToken(String idTokenString) {
        try {
            GoogleIdTokenVerifier verifier = new GoogleIdTokenVerifier.Builder(new NetHttpTransport(), GsonFactory.getDefaultInstance())
                    .setAudience(Collections.singletonList(googleClientId))
                    .build();

            GoogleIdToken idToken = verifier.verify(idTokenString);
            if (idToken == null) {
                throw new UnauthorizedException("Token đăng nhập Google không hợp lệ hoặc đã hết hạn");
            }
            return idToken.getPayload();
        } catch (UnauthorizedException e) {
            throw e;
        } catch (Exception e) {
            throw new UnauthorizedException("Không thể xác minh tài khoản Google. Vui lòng thử lại");
        }
    }
}
