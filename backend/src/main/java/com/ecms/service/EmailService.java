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

    // UC-55: gửi email chào mừng kèm mật khẩu tạm khi admin activate tài khoản nhân viên mới
    void sendNewStaffAccountEmail(String toEmail, String fullName, String tempPassword);

    // UC-55: gửi email báo mật khẩu mới khi admin đặt lại mật khẩu cho một tài khoản
    // (dùng cho cả nhân viên và patient — khác sendNewStaffAccountEmail vốn chỉ dành cho lần activate đầu tiên)
    void sendAdminPasswordResetEmail(String toEmail, String fullName, String tempPassword);
}
