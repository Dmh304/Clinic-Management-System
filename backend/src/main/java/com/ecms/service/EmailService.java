package com.ecms.service;

public interface EmailService {

    // Gửi email chứa liên kết xác minh tài khoản sau khi đăng ký
    void sendVerifyEmail(String toEmail, String fullName, String verifyLink);

    // Gửi email chứa liên kết đặt lại mật khẩu
    void sendPasswordResetEmail(String toEmail, String fullName, String resetLink);

    // Gửi email thông báo tài khoản đăng nhập bằng Google nên không thể đặt lại mật khẩu
    void sendGoogleAccountNotice(String toEmail, String fullName);

    // Gửi email chứa mã OTP đăng nhập (dành cho nhân viên, xác thực 2 lớp)
    void sendLoginOtp(String toEmail, String fullName, String otp);

    // Gửi email chứa mã OTP xác nhận đổi mật khẩu
    void sendChangePasswordOtp(String toEmail, String fullName, String otp);
}
