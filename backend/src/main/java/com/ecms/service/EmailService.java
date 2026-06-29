package com.ecms.service;

import java.time.LocalDateTime;

/**
 * UC-13: Dịch vụ gửi email cho bệnh nhân.
 * Dùng cho nhắc lịch hẹn (24h trước giờ khám) và thông báo huỷ lịch.
 */
public interface EmailService {

    /**
     * Gửi email nhắc lịch hẹn sắp tới cho bệnh nhân.
     *
     * @param toEmail         email người nhận
     * @param patientName     tên bệnh nhân
     * @param doctorName      tên bác sĩ phụ trách (có thể null)
     * @param appointmentTime thời gian khám
     */
    void sendAppointmentReminder(String toEmail, String patientName, String doctorName,
            LocalDateTime appointmentTime);

    /**
     * Gửi email thông báo lịch hẹn đã bị huỷ.
     *
     * @param toEmail         email người nhận
     * @param patientName     tên bệnh nhân
     * @param appointmentTime thời gian khám đã huỷ
     * @param reason          lý do huỷ (có thể null)
     */
    void sendCancellationNotice(String toEmail, String patientName, LocalDateTime appointmentTime,
            String reason);

    /**
     * UC-18: Gửi email thông báo chuyển lịch hẹn (đổi bác sĩ và/hoặc đổi giờ) cho
     * bệnh nhân / bác sĩ liên quan.
     *
     * @param toEmail       email người nhận
     * @param recipientName tên người nhận (bệnh nhân hoặc bác sĩ)
     * @param oldTime       giờ khám cũ
     * @param newTime       giờ khám mới
     * @param newDoctorName tên bác sĩ phụ trách mới (null nếu không đổi bác sĩ)
     */
    void sendReassignmentNotice(String toEmail, String recipientName, LocalDateTime oldTime,
            LocalDateTime newTime, String newDoctorName);
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
