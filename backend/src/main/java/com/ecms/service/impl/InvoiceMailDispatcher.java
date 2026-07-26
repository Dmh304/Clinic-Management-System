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
 * @author  ThangNB - HE201024
 * @created 2026-07-11
 * @updated 2026-07-11
 *
 * Background worker that emails the e-invoice PDF to the patient (UC-24),
 * running on the dedicated "mailExecutor" pool.
 *
 * Why it is split out: Gmail SMTP can take several seconds. Sending on the
 * request thread would hold the HTTP response open until SMTP finished, so the
 * frontend appeared to hang even though the mail went out. The endpoint now
 * returns immediately after flagging the invoice SENDING, and this worker does
 * the send plus the status update.
 *
 * Just as important, the SMTP call sits outside any DB transaction, so a slow
 * mail server never pins a HikariCP connection for its duration.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class InvoiceMailDispatcher {

    private final JavaMailSender mailSender;
    private final InvoiceService invoiceService;

    @Value("${spring.mail.username:no-reply@ecms.vn}")
    private String fromAddress;

    /**
     * Renders and sends the e-invoice email, then records the outcome.
     *
     * Runs asynchronously — the caller has already returned to the client.
     * Never rethrows: a mail failure must not undo a payment that was
     * genuinely collected, so the error is logged and the invoice is flagged
     * FAILED, which is what exposes the resend action described in UC-24 E1.
     *
     * @param invoiceId invoice to send
     */
    @Async("mailExecutor")
    public void dispatch(Long invoiceId) {
        try {
            // Short read transaction, then build the HTML body from the DTO
            InvoiceResponse inv = invoiceService.getInvoiceById(invoiceId);

            // SMTP send — outside any transaction, holds no DB connection
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
            // UC-24 E1: the invoice stays PAID, only the delivery state turns
            // FAILED so the Receptionist can retry or print instead.
            log.error("Gửi email hóa đơn id={} thất bại: {}", invoiceId, e.getMessage());
            invoiceService.markEmailStatus(invoiceId, "FAILED");
        }
    }
}
