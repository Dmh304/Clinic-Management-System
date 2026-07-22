package com.ecms.service;

import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * UC-13: Dịch vụ gửi email cho bệnh nhân.
 * Dùng cho nhắc lịch hẹn (24h trước giờ khám) và thông báo huỷ lịch.
 */
public interface EmailService {

    // Le Thi Bich Ngan - HE204710 | Tạo: 18/07/2026
    // Chức năng: khai báo API gửi email xác nhận đặt lịch — bổ sung cho luồng
    // đặt lịch online (UC-11) để bệnh nhân nhận được email ngay sau khi đặt
    // thành công, thay vì chỉ thấy trạng thái PENDING trên UI.
    /**
     * Gửi email xác nhận ngay sau khi bệnh nhân đặt lịch khám thành công (online).
     *
     * @param toEmail         email người nhận (tài khoản đặt lịch)
     * @param patientName     tên người được khám (có thể khác người đặt nếu đặt hộ)
     * @param doctorName      tên bác sĩ phụ trách
     * @param appointmentTime thời gian khám
     * @param serviceName     tên dịch vụ đã chọn (có thể null nếu đặt khám thường)
     */
    void sendBookingConfirmation(String toEmail, String patientName, String doctorName,
            LocalDateTime appointmentTime, String serviceName);

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

    /**
     * Tạo ngày 21/07/2026
     * Gửi email xác nhận đăng ký dịch vụ chăm sóc (CARE) — dùng chung cho cả 3 kênh
     * đăng ký (tự đặt online, lễ tân đăng ký tại quầy/điện thoại-Zalo, lễ tân đặt
     * buổi từ đăng ký đã xác nhận), gọi ngay sau khi buổi chăm sóc đầu tiên được đặt.
     *
     * @param toEmail            email người nhận (bệnh nhân)
     * @param patientName        tên bệnh nhân
     * @param serviceName        tên gói dịch vụ đã đăng ký
     * @param scheduledDateTime  thời gian buổi chăm sóc đầu tiên
     */
    void sendServiceRegistrationConfirmation(String toEmail, String patientName, String serviceName,
            LocalDateTime scheduledDateTime);

    /**
     * Gửi email thông báo chương trình khuyến mãi — Manager bấm gửi thủ công cho toàn bộ
     * bệnh nhân có email trong hệ thống (broadcast, không phải gửi hàng loạt tự động).
     *
     * @param toEmail       email người nhận (bệnh nhân)
     * @param patientName   tên bệnh nhân
     * @param campaignName  tên chương trình khuyến mãi
     * @param description   mô tả ngắn (có thể null)
     * @param discountLabel   giá trị giảm đã định dạng sẵn (vd "20%" hoặc "50.000đ")
     * @param validTo         ngày hết hạn chương trình
     * @param detailUrl       link tới trang chi tiết khuyến mãi công khai
     * @param unsubscribeUrl  link hủy đăng ký nhận email khuyến mãi (không cần đăng nhập)
     */
    void sendPromotionAnnouncement(String toEmail, String patientName, String campaignName, String description,
            String discountLabel, LocalDate validTo, String detailUrl, String unsubscribeUrl);
}
