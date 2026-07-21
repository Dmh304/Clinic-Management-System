package com.ecms.service.impl;

import com.ecms.dto.response.InvoiceResponse;
import com.ecms.service.InvoiceService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;

import jakarta.mail.internet.MimeMessage;

/**
 * Worker gửi email hóa đơn chạy NỀN trên pool "mailExecutor".
 *
 * Vì sao tách riêng: SMTP (Gmail) có thể chậm vài giây. Nếu gửi ngay trên
 * thread request thì HTTP response bị treo tới khi SMTP xong -> frontend báo
 * "không nhận response" dù email vẫn tới. Ở đây endpoint đã trả về ngay
 * (sau khi đánh dấu SENDING), còn việc gửi + cập nhật tình trạng chạy nền.
 *
 * Quan trọng: việc gửi SMTP KHÔNG nằm trong transaction DB, nên không giữ
 * connection HikariCP suốt thời gian chờ SMTP.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class InvoiceMailDispatcher {

    private final JavaMailSender mailSender;
    private final InvoiceService invoiceService;

    @Value("${spring.mail.username:no-reply@ecms.vn}")
    private String fromAddress;

    @Async("mailExecutor")
    public void dispatch(Long invoiceId) {
        try {
            // Đọc dữ liệu (transaction ngắn) rồi build HTML từ DTO
            InvoiceResponse inv = invoiceService.getInvoiceById(invoiceId);

            // Gửi SMTP — ngoài transaction, không giữ DB connection
            MimeMessage mime = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(mime, true, "UTF-8");
            helper.setFrom(fromAddress);
            helper.setTo(inv.getPatientEmail());
            helper.setSubject("Hóa đơn khám bệnh - " + inv.getInvoiceCode());
            helper.setText(InvoiceEmailTemplate.build(inv), true);
            mailSender.send(mime);

            invoiceService.markEmailStatus(invoiceId, "SENT");
            log.info("Đã gửi email hóa đơn {} tới {}", inv.getInvoiceCode(), inv.getPatientEmail());
        } catch (Exception e) {
            // Hóa đơn vẫn PAID; chỉ tình trạng gửi = FAILED để lễ tân gửi lại
            log.error("Gửi email hóa đơn id={} thất bại: {}", invoiceId, e.getMessage());
            invoiceService.markEmailStatus(invoiceId, "FAILED");
        }
    }
}
