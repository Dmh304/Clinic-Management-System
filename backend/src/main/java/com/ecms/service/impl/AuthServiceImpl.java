// Mạnh Hùng - HE200743
// Triển khai các nghiệp vụ xác thực: đăng nhập (kiểm tra email, trạng thái, mật khẩu, tạo JWT),
// đổi mật khẩu (xác minh mật khẩu cũ, mã hóa và lưu mật khẩu mới),
// và đăng ký tài khoản bệnh nhân mới (kiểm tra email trùng, gán vai trò PATIENT, tạo JWT).
package com.ecms.service.impl;

import com.ecms.dto.request.ChangePasswordRequest;
import com.ecms.dto.request.LoginRequest;
import com.ecms.dto.request.RegisterRequest;
import com.ecms.dto.response.AuthResponse;
import com.ecms.entity.Doctor;
import com.ecms.entity.Role;
import com.ecms.entity.User;
import com.ecms.exception.ResourceNotFoundException;
import com.ecms.exception.UnauthorizedException;
import com.ecms.repository.DoctorRepository;
import com.ecms.repository.RoleRepository;
import com.ecms.repository.UserRepository;
import com.ecms.security.JwtUtil;
import com.ecms.service.AuthService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class AuthServiceImpl implements AuthService {

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final DoctorRepository doctorRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;

    // Xác thực người dùng: kiểm tra email tồn tại, trạng thái tài khoản, mật khẩu; tạo và trả về JWT
    @Override
    public AuthResponse login(LoginRequest request) {
        User user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new UnauthorizedException("Email hoặc mật khẩu không đúng"));

        if (!"ACTIVE".equals(user.getStatus())) {
            throw new UnauthorizedException("Tài khoản đã bị vô hiệu hóa. Vui lòng liên hệ quản trị viên");
        }

        if (!passwordEncoder.matches(request.getPassword(), user.getPasswordHash())) {
            throw new UnauthorizedException("Email hoặc mật khẩu không đúng");
        }

        if (user.getRole() == null) {
            throw new UnauthorizedException("Tài khoản chưa được gán vai trò");
        }
        String roleName = user.getRole().getName();

        Long doctorId = null;
        if ("DOCTOR".equals(roleName)) {
            doctorId = doctorRepository.findByUserId(user.getId()).map(Doctor::getId).orElse(null);
        }

        String token = jwtUtil.generateToken(user.getEmail(), roleName, doctorId);

        return AuthResponse.builder()
                .token(token)
                .tokenType("Bearer")
                .userId(user.getId())
                .email(user.getEmail())
                .fullName(user.getFullName())
                .role(roleName)
                .doctorId(doctorId)
                .build();
    }

    // Đổi mật khẩu: kiểm tra mật khẩu mới và xác nhận khớp nhau, xác minh mật khẩu cũ rồi lưu mật khẩu mới đã mã hóa
    @Override
    @Transactional
    public void changePassword(String email, ChangePasswordRequest request) {
        if (!request.getNewPassword().equals(request.getConfirmPassword())) {
            throw new IllegalArgumentException("Mật khẩu mới và xác nhận mật khẩu không khớp");
        }

        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("Người dùng không tồn tại"));

        if (!passwordEncoder.matches(request.getCurrentPassword(), user.getPasswordHash())) {
            throw new IllegalArgumentException("Mật khẩu hiện tại không đúng");
        }

        user.setPasswordHash(passwordEncoder.encode(request.getNewPassword()));
        userRepository.save(user);
    }

    // Đăng ký tài khoản: kiểm tra email chưa tồn tại, tạo User với vai trò PATIENT, mã hóa mật khẩu và trả về JWT
    @Override
    @Transactional
    public AuthResponse register(RegisterRequest request) {
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
                .build();

        userRepository.save(user);

        String token = jwtUtil.generateToken(user.getEmail(), patientRole.getName(), null);

        return AuthResponse.builder()
                .token(token)
                .tokenType("Bearer")
                .userId(user.getId())
                .email(user.getEmail())
                .fullName(user.getFullName())
                .role(patientRole.getName())
                .build();
    }
}
