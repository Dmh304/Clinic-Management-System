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
}
