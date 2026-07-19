package com.ecms.service.impl;

import com.ecms.service.EmailService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;
import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import org.springframework.mail.javamail.MimeMessageHelper;


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

    // Le Thi Bich Ngan - HE204710 | Tạo: 18/07/2026
    // Chức năng: soạn nội dung HTML + gửi email xác nhận đặt lịch (UC-11) — dùng
    // sendHtmlSafe() để lỗi SMTP không làm rollback giao dịch đặt lịch chính.
    @Override
    public void sendBookingConfirmation(String toEmail, String patientName, String doctorName,
            LocalDateTime appointmentTime, String serviceName) {
        if (toEmail == null || toEmail.isBlank()) {
            log.warn("Bỏ qua email xác nhận đặt lịch: {} không có email", patientName);
            return;
        }

        String servicePart = (serviceName != null && !serviceName.isBlank())
                ? "<p><strong>Dịch vụ:</strong> " + serviceName + "</p>"
                : "";
        String doctorPart = (doctorName != null && !doctorName.isBlank())
                ? "<p><strong>Bác sĩ phụ trách:</strong> " + doctorName + "</p>"
                : "";

        String html = """
                <div style="font-family:Segoe UI,Arial,sans-serif;max-width:480px;margin:auto">
                  <h2 style="color:#1d4ed8">Đặt lịch khám thành công</h2>
                  <p>Xin chào %s,</p>
                  <p>Phòng khám Mắt ECMS đã nhận được lịch hẹn của bạn với thông tin sau:</p>
                  <p><strong>Thời gian khám:</strong> %s</p>
                  %s
                  %s
                  <p style="color:#92400e;background:#fef3c7;padding:8px 12px;border-radius:6px;display:inline-block">
                    Trạng thái: Đang chờ xác nhận (PENDING)
                  </p>
                  <p>Lễ tân sẽ xác nhận lịch hẹn trong thời gian sớm nhất. Vui lòng đến trước giờ khám 10–15 phút để làm thủ tục.</p>
                  <p style="color:#6b7280;font-size:13px">Nếu bạn không thực hiện yêu cầu này, vui lòng liên hệ phòng khám.</p>
                </div>
                """.formatted(safe(patientName), appointmentTime.format(TIME_FORMAT), servicePart, doctorPart);

        sendHtmlSafe(toEmail, "[ECMS] Xác nhận đặt lịch khám", html);
    }

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

        sendText(toEmail, "[ECMS] Nhắc lịch khám", body);
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

        sendText(toEmail, "[ECMS] Thông báo huỷ lịch khám", body);
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

        sendText(toEmail, "[ECMS] Thông báo chuyển lịch khám", body);
    }

    // Gửi email text/plain, bọc try-catch để lỗi SMTP không lan ra ngoài
    private void sendText(String toEmail, String subject, String body) {
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

    @Override
    public void sendVerifyEmail(String toEmail, String fullName, String verifyLink) {
        String html = """
                <div style="font-family:Segoe UI,Arial,sans-serif;max-width:480px;margin:auto">
                  <h2 style="color:#1d4ed8">Xác minh tài khoản ECMS</h2>
                  <p>Xin chào %s,</p>
                  <p>Vui lòng nhấn vào liên kết bên dưới để xác minh email và kích hoạt tài khoản. Liên kết có hiệu lực trong 24 giờ.</p>
                  <p><a href="%s" style="display:inline-block;background:#1d4ed8;color:#fff;padding:10px 22px;border-radius:8px;text-decoration:none">Xác minh email</a></p>
                  <p style="color:#6b7280;font-size:13px">Nếu bạn không tạo tài khoản này, vui lòng bỏ qua email này.</p>
                </div>
                """.formatted(fullName, verifyLink);
        sendHtml(toEmail, "Xác minh tài khoản ECMS", html);
    }

    @Override
    public void sendPasswordResetEmail(String toEmail, String fullName, String resetLink) {
        String html = """
                <div style="font-family:Segoe UI,Arial,sans-serif;max-width:480px;margin:auto">
                  <h2 style="color:#1d4ed8">Đặt lại mật khẩu ECMS</h2>
                  <p>Xin chào %s,</p>
                  <p>Nhấn vào liên kết bên dưới để đặt lại mật khẩu. Liên kết có hiệu lực trong 15 phút.</p>
                  <p><a href="%s" style="display:inline-block;background:#1d4ed8;color:#fff;padding:10px 22px;border-radius:8px;text-decoration:none">Đặt lại mật khẩu</a></p>
                  <p style="color:#6b7280;font-size:13px">Nếu bạn không yêu cầu đặt lại mật khẩu, vui lòng bỏ qua email này.</p>
                </div>
                """.formatted(fullName, resetLink);
        sendHtml(toEmail, "Đặt lại mật khẩu ECMS", html);
    }

    @Override
    public void sendGoogleAccountNotice(String toEmail, String fullName) {
        String html = """
                <div style="font-family:Segoe UI,Arial,sans-serif;max-width:480px;margin:auto">
                  <h2 style="color:#1d4ed8">Yêu cầu đặt lại mật khẩu ECMS</h2>
                  <p>Xin chào %s,</p>
                  <p>Tài khoản của bạn đăng nhập bằng Google nên không có mật khẩu để đặt lại. Vui lòng dùng nút "Đăng nhập với Google" để truy cập hệ thống.</p>
                </div>
                """.formatted(fullName);
        sendHtml(toEmail, "Yêu cầu đặt lại mật khẩu ECMS", html);
    }

    @Override
    public void sendLoginOtp(String toEmail, String fullName, String otp) {
        String html = """
                <div style="font-family:Segoe UI,Arial,sans-serif;max-width:480px;margin:auto">
                  <h2 style="color:#1d4ed8">Mã xác thực đăng nhập ECMS</h2>
                  <p>Xin chào %s,</p>
                  <p>Mã OTP đăng nhập của bạn là:</p>
                  <p style="font-size:28px;font-weight:700;letter-spacing:4px;color:#1d4ed8">%s</p>
                  <p style="color:#6b7280;font-size:13px">Mã có hiệu lực trong 5 phút. Không chia sẻ mã này với bất kỳ ai.</p>
                </div>
                """.formatted(fullName, otp);
        sendHtml(toEmail, "Mã xác thực đăng nhập ECMS", html);
    }

    @Override
    public void sendChangePasswordOtp(String toEmail, String fullName, String otp) {
        String html = """
                <div style="font-family:Segoe UI,Arial,sans-serif;max-width:480px;margin:auto">
                  <h2 style="color:#1d4ed8">Mã xác nhận đổi mật khẩu ECMS</h2>
                  <p>Xin chào %s,</p>
                  <p>Mã OTP xác nhận đổi mật khẩu của bạn là:</p>
                  <p style="font-size:28px;font-weight:700;letter-spacing:4px;color:#1d4ed8">%s</p>
                  <p style="color:#6b7280;font-size:13px">Mã có hiệu lực trong 5 phút. Không chia sẻ mã này với bất kỳ ai.</p>
                </div>
                """.formatted(fullName, otp);
        sendHtml(toEmail, "Mã xác nhận đổi mật khẩu ECMS", html);
    }

    @Override
    public void sendNewStaffAccountEmail(String toEmail, String fullName, String tempPassword) {
        String html = """
                <div style="font-family:Segoe UI,Arial,sans-serif;max-width:480px;margin:auto">
                  <h2 style="color:#1d4ed8">Chào mừng bạn đến với ECMS</h2>
                  <p>Xin chào %s,</p>
                  <p>Tài khoản nhân viên của bạn đã được quản trị viên kích hoạt. Vui lòng đăng nhập bằng email này và mật khẩu tạm dưới đây, sau đó đổi mật khẩu ngay lần đăng nhập đầu tiên:</p>
                  <p style="font-size:22px;font-weight:700;letter-spacing:2px;color:#1d4ed8">%s</p>
                  <p style="color:#6b7280;font-size:13px">Không chia sẻ mật khẩu này với bất kỳ ai. Nếu bạn không yêu cầu tài khoản này, vui lòng liên hệ quản trị viên hệ thống.</p>
                </div>
                """.formatted(fullName, tempPassword);
        sendHtml(toEmail, "Tài khoản nhân viên ECMS của bạn đã được kích hoạt", html);
    }

    @Override
    public void sendAdminPasswordResetEmail(String toEmail, String fullName, String tempPassword) {
        String html = """
                <div style="font-family:Segoe UI,Arial,sans-serif;max-width:480px;margin:auto">
                  <h2 style="color:#1d4ed8">Mật khẩu của bạn đã được đặt lại</h2>
                  <p>Xin chào %s,</p>
                  <p>Quản trị viên đã đặt lại mật khẩu cho tài khoản của bạn. Mật khẩu tạm mới:</p>
                  <p style="font-size:22px;font-weight:700;letter-spacing:2px;color:#1d4ed8">%s</p>
                  <p style="color:#6b7280;font-size:13px">Vui lòng đăng nhập bằng mật khẩu này và đổi mật khẩu ngay sau đó. Nếu bạn không yêu cầu việc này, vui lòng liên hệ quản trị viên hệ thống.</p>
                </div>
                """.formatted(fullName, tempPassword);
        sendHtml(toEmail, "Mật khẩu ECMS của bạn đã được đặt lại", html);
    }

    // Le Thi Bich Ngan - HE204710 | Tạo: 18/07/2026
    // Chức năng: helper dùng chung cho mọi email phát sinh giữa luồng nghiệp vụ
    // đặt lịch (xác nhận đặt lịch, nhắc lịch, huỷ lịch...) — bắt lỗi SMTP và chỉ
    // log lại, không ném ra ngoài, để việc gửi mail thất bại không làm rollback
    // giao dịch appointment chính (đặt lịch/huỷ lịch vẫn phải thành công dù mail lỗi).
    private void sendHtmlSafe(String toEmail, String subject, String html) {
        try {
            sendHtml(toEmail, subject, html);
            log.info("Đã gửi email '{}' tới {}", subject, toEmail);
        } catch (Exception e) {
            log.error("Gửi email '{}' tới {} thất bại: {}", subject, toEmail, e.getMessage());
        }
    }

    private void sendHtml(String toEmail, String subject, String html) {
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, "UTF-8");
            helper.setFrom(fromAddress);
            helper.setTo(toEmail);
            helper.setSubject(subject);
            helper.setText(html, true);
            mailSender.send(message);
        } catch (MessagingException e) {
            throw new IllegalStateException("Không thể gửi email: " + e.getMessage(), e);
        }
    }
}
