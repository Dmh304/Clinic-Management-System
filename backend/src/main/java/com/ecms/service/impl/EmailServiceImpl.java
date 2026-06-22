package com.ecms.service.impl;

import com.ecms.service.EmailService;
import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class EmailServiceImpl implements EmailService {

    private final JavaMailSender mailSender;

    @Value("${spring.mail.username}")
    private String fromAddress;

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
        send(toEmail, "Xác minh tài khoản ECMS", html);
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
        send(toEmail, "Đặt lại mật khẩu ECMS", html);
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
        send(toEmail, "Yêu cầu đặt lại mật khẩu ECMS", html);
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
        send(toEmail, "Mã xác thực đăng nhập ECMS", html);
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
        send(toEmail, "Mã xác nhận đổi mật khẩu ECMS", html);
    }

    private void send(String toEmail, String subject, String html) {
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
