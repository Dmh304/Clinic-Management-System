package com.ecms.service.impl;

import com.ecms.service.EmailService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;

/**
 * UC-13: Triển khai gửi email bằng JavaMailSender (Spring Boot Mail Starter).
 * Cấu hình SMTP đọc từ application.properties (spring.mail.*).
 *
 * Mọi lỗi gửi mail đều được log lại bằng log.error và KHÔNG ném lại ngoại lệ,
 * tránh làm crash cron job nhắc lịch khi SMTP gặp sự cố.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class EmailServiceImpl implements EmailService {

    private static final DateTimeFormatter TIME_FORMAT = DateTimeFormatter.ofPattern("HH:mm 'ngày' dd/MM/yyyy");

    private final JavaMailSender mailSender;

    // Địa chỉ gửi đi — mặc định lấy theo tài khoản SMTP đã cấu hình
    @Value("${spring.mail.username:no-reply@ecms.vn}")
    private String fromAddress;

    @Override
    public void sendAppointmentReminder(String toEmail, String patientName, String doctorName,
            LocalDateTime appointmentTime) {
        if (toEmail == null || toEmail.isBlank()) {
            log.warn("Bỏ qua nhắc lịch: bệnh nhân {} không có email", patientName);
            return;
        }

        String doctorPart = (doctorName != null && !doctorName.isBlank())
                ? "Bác sĩ phụ trách: " + doctorName + "\n"
                : "";

        String body = "Xin chào " + safe(patientName) + ",\n\n"
                + "Phòng khám Mắt ECMS xin nhắc bạn có lịch khám vào lúc "
                + appointmentTime.format(TIME_FORMAT) + ".\n"
                + doctorPart
                + "\nVui lòng đến trước giờ khám 15 phút để làm thủ tục.\n"
                + "Nếu cần thay đổi lịch, vui lòng liên hệ phòng khám.\n\n"
                + "Trân trọng,\nPhòng khám Mắt ECMS";

        send(toEmail, "[ECMS] Nhắc lịch khám", body);
    }

    @Override
    public void sendCancellationNotice(String toEmail, String patientName, LocalDateTime appointmentTime,
            String reason) {
        if (toEmail == null || toEmail.isBlank()) {
            log.warn("Bỏ qua thông báo huỷ: bệnh nhân {} không có email", patientName);
            return;
        }

        String reasonPart = (reason != null && !reason.isBlank())
                ? "Lý do: " + reason + "\n"
                : "";

        String body = "Xin chào " + safe(patientName) + ",\n\n"
                + "Lịch khám của bạn vào lúc " + appointmentTime.format(TIME_FORMAT)
                + " đã được huỷ.\n"
                + reasonPart
                + "\nNếu cần đặt lại lịch, vui lòng truy cập hệ thống hoặc liên hệ phòng khám.\n\n"
                + "Trân trọng,\nPhòng khám Mắt ECMS";

        send(toEmail, "[ECMS] Thông báo huỷ lịch khám", body);
    }

    @Override
    public void sendReassignmentNotice(String toEmail, String recipientName, LocalDateTime oldTime,
            LocalDateTime newTime, String newDoctorName) {
        if (toEmail == null || toEmail.isBlank()) {
            log.warn("Bỏ qua thông báo chuyển lịch: {} không có email", recipientName);
            return;
        }

        String doctorPart = (newDoctorName != null && !newDoctorName.isBlank())
                ? "Bác sĩ phụ trách mới: " + newDoctorName + "\n"
                : "";

        String body = "Xin chào " + safe(recipientName) + ",\n\n"
                + "Lịch khám của bạn đã được thay đổi:\n"
                + "- Giờ cũ: " + oldTime.format(TIME_FORMAT) + "\n"
                + "- Giờ mới: " + newTime.format(TIME_FORMAT) + "\n"
                + doctorPart
                + "\nVui lòng kiểm tra lại lịch khám trên hệ thống.\n\n"
                + "Trân trọng,\nPhòng khám Mắt ECMS";

        send(toEmail, "[ECMS] Thông báo chuyển lịch khám", body);
    }

    // Gửi email text/plain, bọc try-catch để lỗi SMTP không lan ra ngoài
    private void send(String toEmail, String subject, String body) {
        try {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setFrom(fromAddress);
            message.setTo(toEmail);
            message.setSubject(subject);
            message.setText(body);
            mailSender.send(message);
            log.info("Đã gửi email '{}' tới {}", subject, toEmail);
        } catch (Exception e) {
            log.error("Gửi email '{}' tới {} thất bại: {}", subject, toEmail, e.getMessage());
        }
    }

    private String safe(String s) {
        return s != null ? s : "";
    }
}
