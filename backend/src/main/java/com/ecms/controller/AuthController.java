// Mạnh Hùng - HE200743
// Controller xử lý các API xác thực người dùng: đăng ký + xác minh email, đăng nhập bệnh nhân/nhân viên (2FA OTP),
// quên/đặt lại mật khẩu, đổi mật khẩu qua OTP và mở khóa tài khoản (admin).
// Tất cả endpoint đều nằm dưới prefix /api/v1/auth và trả về chuẩn ApiResponse.
package com.ecms.controller;

import com.ecms.dto.request.*;
import com.ecms.dto.response.ApiResponse;
import com.ecms.dto.response.AuthResponse;
import com.ecms.service.AuthService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

    // Đăng ký tài khoản bệnh nhân mới (trạng thái PENDING_VERIFICATION) và gửi email xác minh
    @PostMapping("/register")
    public ResponseEntity<ApiResponse<Void>> register(@Valid @RequestBody RegisterRequest request) {
        authService.register(request);
        return ResponseEntity.ok(ApiResponse.success("Đăng ký thành công. Vui lòng kiểm tra email để xác minh tài khoản", null));
    }

    // Xác minh email từ liên kết được gửi sau khi đăng ký
    @GetMapping("/verify-email")
    public ResponseEntity<ApiResponse<Void>> verifyEmail(@RequestParam String token) {
        authService.verifyEmail(token);
        return ResponseEntity.ok(ApiResponse.success("Xác minh email thành công. Bạn có thể đăng nhập ngay bây giờ", null));
    }

    // Gửi lại email xác minh cho tài khoản chưa kích hoạt
    @PostMapping("/resend-verification")
    public ResponseEntity<ApiResponse<Void>> resendVerification(@Valid @RequestBody ResendVerificationRequest request) {
        authService.resendVerification(request);
        return ResponseEntity.ok(ApiResponse.success("Email xác minh đã được gửi lại", null));
    }

    // Đăng nhập bệnh nhân: xác thực email-hoặc-số điện thoại/mật khẩu và trả về token JWT cùng thông tin người dùng
    @PostMapping("/login")
    public ResponseEntity<ApiResponse<AuthResponse>> login(@Valid @RequestBody LoginRequest request) {
        AuthResponse data = authService.login(request);
        return ResponseEntity.ok(ApiResponse.success("Đăng nhập thành công", data));
    }

    // Đăng nhập bằng tài khoản Google: xác minh ID token, tự động tạo tài khoản PATIENT nếu email chưa tồn tại
    @PostMapping("/google")
    public ResponseEntity<ApiResponse<AuthResponse>> loginWithGoogle(@Valid @RequestBody GoogleLoginRequest request) {
        AuthResponse data = authService.loginWithGoogle(request);
        return ResponseEntity.ok(ApiResponse.success("Đăng nhập bằng Google thành công", data));
    }

    // Bước 1 đăng nhập nhân viên: xác thực email/mật khẩu, gửi mã OTP qua email (chưa cấp JWT)
    @PostMapping("/staff/login")
    public ResponseEntity<ApiResponse<Void>> staffLogin(@Valid @RequestBody StaffLoginRequest request) {
        authService.staffLogin(request);
        return ResponseEntity.ok(ApiResponse.success("Mã OTP đã được gửi đến email của bạn", null));
    }

    // Bước 2 đăng nhập nhân viên: xác minh mã OTP, cấp JWT nếu hợp lệ
    @PostMapping("/staff/verify-otp")
    public ResponseEntity<ApiResponse<AuthResponse>> staffVerifyOtp(@Valid @RequestBody StaffVerifyOtpRequest request) {
        AuthResponse data = authService.staffVerifyOtp(request);
        return ResponseEntity.ok(ApiResponse.success("Đăng nhập thành công", data));
    }

    // Yêu cầu quên mật khẩu: luôn phản hồi giống nhau để tránh dò email tồn tại trong hệ thống
    @PostMapping("/forgot-password")
    public ResponseEntity<ApiResponse<Void>> forgotPassword(@Valid @RequestBody ForgotPasswordRequest request) {
        authService.forgotPassword(request);
        return ResponseEntity.ok(ApiResponse.success("Nếu email tồn tại trong hệ thống, hướng dẫn đặt lại mật khẩu đã được gửi", null));
    }

    // Đặt lại mật khẩu bằng token nhận qua email
    @PostMapping("/reset-password")
    public ResponseEntity<ApiResponse<Void>> resetPassword(@Valid @RequestBody ResetPasswordRequest request) {
        authService.resetPassword(request);
        return ResponseEntity.ok(ApiResponse.success("Đặt lại mật khẩu thành công", null));
    }

    // Bước 1 đổi mật khẩu cho người dùng đang đăng nhập: xác minh mật khẩu hiện tại, gửi mã OTP xác nhận
    @PutMapping("/change-password")
    public ResponseEntity<ApiResponse<Void>> changePassword(
            Authentication authentication,
            @Valid @RequestBody ChangePasswordRequest request) {
        authService.changePassword(authentication.getName(), request);
        return ResponseEntity.ok(ApiResponse.success("Mã OTP xác nhận đã được gửi đến email của bạn", null));
    }

    // Bước 2 đổi mật khẩu: xác minh mã OTP rồi áp dụng mật khẩu mới
    @PostMapping("/change-password/verify-otp")
    public ResponseEntity<ApiResponse<Void>> verifyChangePasswordOtp(
            Authentication authentication,
            @Valid @RequestBody VerifyChangePasswordOtpRequest request) {
        authService.verifyChangePasswordOtp(authentication.getName(), request);
        return ResponseEntity.ok(ApiResponse.success("Đổi mật khẩu thành công", null));
    }

    // Mở khóa tài khoản nhân viên bị khóa do nhập sai mật khẩu quá số lần cho phép (chỉ ADMIN)
    @PostMapping("/admin/unlock-user")
    public ResponseEntity<ApiResponse<Void>> adminUnlockUser(@Valid @RequestBody AdminUnlockUserRequest request) {
        authService.adminUnlockUser(request.getUserId());
        return ResponseEntity.ok(ApiResponse.success("Mở khóa tài khoản thành công", null));
    }
}
