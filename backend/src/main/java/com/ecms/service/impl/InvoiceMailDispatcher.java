package com.ecms.service.impl;

import com.ecms.dto.response.InvoiceResponse;
import com.ecms.service.InvoiceService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;

import jakarta.mail.internet.MimeMessage;

import java.util.Map;

/**
 * @author  ThangNB - HE201024
 * @created 2026-07-11
 * @updated 2026-07-26
 *
 * Background worker that emails the patient about an invoice (UC-24 Deliver
 * Invoice), running on the dedicated "mailExecutor" pool.
 *
 * Sends one of two distinct documents, chosen from the invoice's payment state:
 *   - <strong>payment reminder</strong> — invoice not settled: amount due plus
 *     transfer instructions, no attachment (UC-23 step 3)
 *   - <strong>paid invoice</strong> — invoice settled: receipt with the invoice
 *     PDF attached (UC-24 POST-1)
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

    // Receiving account shown in the payment reminder. Same properties the
    // VietQR image is built from, so the memo the patient is told to use is
    // guaranteed to match what the webhook will reconcile against.
    @Value("${payment.bank.id:}")
    private String bankId;
    @Value("${payment.bank.account:}")
    private String bankAccount;
    @Value("${payment.bank.account-name:}")
    private String bankAccountName;

    /**
     * Sends the billing email for an invoice and records the outcome.
     *
     * Routes on {@code paymentStatus}, so every call site gets the correct
     * document without having to know which one it wants:
     *   - PAID → receipt, <strong>with the invoice PDF attached</strong> (UC-24 POST-1)
     *   - anything else → payment reminder with transfer instructions, no
     *     attachment, because under BR-10 the invoice is not issued yet and
     *     there is no document to send
     *
     * Runs asynchronously — the caller has already returned to the client.
     * Never rethrows: a mail failure must not undo a payment that was genuinely
     * collected, so the error is logged and the invoice is flagged FAILED,
     * which is what exposes the resend action described in UC-24 E1.
     *
     * @param invoiceId invoice to send
     */
    @Async("mailExecutor")
    public void dispatch(Long invoiceId) {
        try {
            // Short read transaction, then render from the detached DTO
            InvoiceResponse inv = invoiceService.getInvoiceById(invoiceId);
            boolean paid = "PAID".equals(inv.getPaymentStatus());

            // SMTP send — outside any transaction, holds no DB connection
            MimeMessage mime = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(mime, true, "UTF-8");
            helper.setFrom(fromAddress);
            helper.setTo(inv.getPatientEmail());

            if (paid) {
                helper.setSubject("Hóa đơn khám bệnh " + inv.getInvoiceCode() + " - đã thanh toán");
                helper.setText(InvoiceEmailTemplate.buildPaidInvoice(inv), true);
                attachPdf(helper, inv);
            } else {
                helper.setSubject("Thông báo thanh toán hóa đơn " + inv.getInvoiceCode());
                helper.setText(InvoiceEmailTemplate.buildPaymentReminder(
                        inv, bankDisplayName(), bankAccount, bankAccountName), true);
            }

            mailSender.send(mime);

            invoiceService.markEmailStatus(invoiceId, "SENT");
            log.info("Đã gửi email {} cho hóa đơn {} tới {}",
                    paid ? "hóa đơn đã thanh toán (kèm PDF)" : "nhắc thanh toán",
                    inv.getInvoiceCode(), inv.getPatientEmail());
        } catch (Exception e) {
            // UC-24 E1: the invoice stays PAID, only the delivery state turns
            // FAILED so the Receptionist can retry or print instead.
            log.error("Gửi email hóa đơn id={} thất bại: {}", invoiceId, e.getMessage());
            invoiceService.markEmailStatus(invoiceId, "FAILED");
        }
    }

    /**
     * Attaches the invoice PDF to a receipt email (UC-24 POST-1).
     *
     * Renders from the DTO already in hand rather than by id, so the PDF cannot
     * disagree with the figures printed in the email body.
     *
     * @param helper the multipart message being built
     * @param inv    the settled invoice, with its charge lines populated
     * @throws jakarta.mail.MessagingException if the attachment cannot be added
     */
    private void attachPdf(MimeMessageHelper helper, InvoiceResponse inv)
            throws jakarta.mail.MessagingException {
        byte[] pdf = invoiceService.generateInvoicePdf(inv);
        helper.addAttachment("hoa-don-" + inv.getInvoiceCode() + ".pdf",
                new ByteArrayResource(pdf), "application/pdf");
    }

    /**
     * Maps the configured Napas bank code to a display name for the reminder
     * email, because a raw code like "970415" means nothing to a patient.
     *
     * @return the bank name, or the raw code when it is not in the table
     */
    private String bankDisplayName() {
        if (bankId == null || bankId.isBlank()) return null;
        return NAPAS_BANKS.getOrDefault(bankId.trim(), bankId.trim());
    }

    /** Napas codes for the banks this clinic is likely to use. */
    private static final Map<String, String> NAPAS_BANKS = Map.of(
            "970415", "VietinBank",
            "970436", "Vietcombank",
            "970418", "BIDV",
            "970405", "Agribank",
            "970422", "MB Bank",
            "970407", "Techcombank",
            "970416", "ACB",
            "970432", "VPBank",
            "970423", "TPBank",
            "970443", "SHB");
}
