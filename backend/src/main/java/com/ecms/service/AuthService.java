// Mạnh Hùng - HE200743
// Interface định nghĩa các hành vi xác thực người dùng: đăng ký, xác minh email, đăng nhập (bệnh nhân/nhân viên),
// xác thực OTP, quên/đặt lại mật khẩu, đổi mật khẩu và mở khóa tài khoản (admin).
package com.ecms.service;

import com.ecms.dto.request.*;
import com.ecms.dto.response.AuthResponse;

public interface AuthService {

    // Đăng ký tài khoản bệnh nhân mới ở trạng thái PENDING_VERIFICATION và gửi email xác minh
    void register(RegisterRequest request);

    // Xác minh email bằng token nhận qua link, kích hoạt tài khoản (chuyển sang ACTIVE)
    void verifyEmail(String token);

    // Gửi lại email xác minh cho tài khoản chưa được kích hoạt
    void resendVerification(ResendVerificationRequest request);

    // Đăng nhập bệnh nhân bằng email-hoặc-số điện thoại + mật khẩu, yêu cầu tài khoản đã ACTIVE
    AuthResponse login(LoginRequest request);

    // Đăng nhập/đăng ký bằng tài khoản Google: xác minh ID token, tìm hoặc tạo tài khoản với vai trò PATIENT
    AuthResponse loginWithGoogle(GoogleLoginRequest request);

    // Bước 1 đăng nhập nhân viên: xác thực email/mật khẩu rồi gửi mã OTP qua email, chưa cấp JWT
    void staffLogin(StaffLoginRequest request);

    // Bước 2 đăng nhập nhân viên: xác minh mã OTP, cấp JWT nếu hợp lệ
    AuthResponse staffVerifyOtp(StaffVerifyOtpRequest request);

    // Yêu cầu quên mật khẩu: luôn phản hồi giống nhau để tránh dò email tồn tại trong hệ thống
    void forgotPassword(ForgotPasswordRequest request);

    // Đặt lại mật khẩu bằng token nhận qua email
    void resetPassword(ResetPasswordRequest request);

    // Bước 1 đổi mật khẩu (đã đăng nhập): xác minh mật khẩu hiện tại rồi gửi mã OTP xác nhận
    void changePassword(String email, ChangePasswordRequest request);

    // Bước 2 đổi mật khẩu: xác minh mã OTP rồi áp dụng mật khẩu mới đã chờ xác nhận
    void verifyChangePasswordOtp(String email, VerifyChangePasswordOtpRequest request);

    // Mở khóa tài khoản nhân viên bị khóa do nhập sai mật khẩu quá số lần cho phép (chỉ ADMIN)
    void adminUnlockUser(Long userId);
}
