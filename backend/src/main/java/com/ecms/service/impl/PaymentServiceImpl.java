package com.ecms.service.impl;

import com.ecms.dto.request.PaymentWebhookRequest;
import com.ecms.dto.request.RefundConfirmRequest;
import com.ecms.dto.response.PaymentStatusResponse;
import com.ecms.dto.response.PaymentTransactionResponse;
import com.ecms.entity.Appointment;
import com.ecms.entity.AppointmentStatus;
import com.ecms.entity.Invoice;
import com.ecms.entity.PaymentTransaction;
import com.ecms.exception.ResourceNotFoundException;
import com.ecms.repository.InvoiceRepository;
import com.ecms.repository.PaymentTransactionRepository;
import com.ecms.service.PaymentService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.Optional;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * @author  ThangNB - HE201024
 * @created 2026-07-11
 * @updated 2026-07-19
 *
 * Automated reconciliation for the VietQR branch of UC-23 (Process Payment).
 *
 * End-to-end flow:
 *  1. The Receptionist creates a draft invoice; the system generates
 *     INV-yyyyMMdd-XXXX.
 *  2. A QR code is produced whose transfer memo carries that invoice code.
 *  3. The patient scans and transfers; the banking app preserves the memo.
 *  4. Funds land in the clinic account and the gateway POSTs a webhook to ECMS.
 *  5. The system recovers the invoice code from the memo, checks the amount,
 *     and settles the invoice on its own.
 *
 * Safety principles baked into the flow:
 *  - Idempotency: gatewayTxnId is UNIQUE and checked first, so a gateway retry
 *    cannot settle the same invoice twice.
 *  - Money is never lost track of: an unmatched transfer is still journalled
 *    as UNMATCHED for manual reconciliation rather than silently 200-ed away.
 *  - BR-10: the invoice is only marked PAID when the money received COVERS the
 *    total. Số tiền được cộng dồn qua mọi lần chuyển của cùng hóa đơn (UC-23 E2),
 *    nên bệnh nhân trả làm nhiều lần vẫn tất toán được; khi tổng lũy kế chưa đủ,
 *    giao dịch ghi PARTIAL và hóa đơn mang trạng thái PARTIALLY_PAID để phân biệt
 *    với "chưa chuyển gì".
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class PaymentServiceImpl implements PaymentService {

    private final InvoiceRepository invoiceRepository;
    private final PaymentTransactionRepository paymentTransactionRepository;
    /** Sends the "payment received" notification to the patient (UC-10). */
    private final com.ecms.service.NotificationService notificationService;
    /** Sends the e-invoice in the background once funds are confirmed (UC-24). */
    private final InvoiceMailDispatcher invoiceMailDispatcher;

    /** Shared secret the gateway must present as {@code Authorization: Apikey <key>}. */
    @Value("${payment.webhook.api-key:}")
    private String webhookApiKey;

    /** Recovers the invoice code from a transfer memo. Banking apps commonly
     *  upper-case the memo and strip hyphens, so both "INV-20250717-0001" and
     *  "INV202507170001" must be accepted. */
    private static final Pattern INVOICE_CODE_PATTERN =
            Pattern.compile("INV[-\\s]?(\\d{8})[-\\s]?(\\d{4})", Pattern.CASE_INSENSITIVE);

    private static final DateTimeFormatter TXN_DATE_FMT =
            DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");

    /**
     * Authenticates a webhook call against the configured gateway API key.
     *
     * @param authorizationHeader raw Authorization header, may be null
     * @return true only on an exact match
     *
     * Validate: fails closed. If no key is configured the method rejects
     * everything rather than running an unprotected webhook — otherwise anyone
     * who knows the URL could mark invoices PAID, defeating BR-10 entirely.
     */
    @Override
    public boolean isValidApiKey(String authorizationHeader) {
        // Fail closed: an unconfigured key must never mean "allow all".
        if (webhookApiKey == null || webhookApiKey.isBlank()) {
            log.error("payment.webhook.api-key chưa được cấu hình — từ chối mọi webhook");
            return false;
        }
        if (authorizationHeader == null || authorizationHeader.isBlank()) {
            return false;
        }
        String expected = "Apikey " + webhookApiKey;
        // Constant-time comparison so the key cannot be recovered by timing.
        return java.security.MessageDigest.isEqual(
                authorizationHeader.trim().getBytes(java.nio.charset.StandardCharsets.UTF_8),
                expected.getBytes(java.nio.charset.StandardCharsets.UTF_8));
    }

    /**
     * Reconciles one incoming-payment webhook and settles the matching invoice
     * (UC-23 ALT-2 step 5).
     *
     * Runs as a single transaction so the journal entry, the invoice update and
     * the appointment completion either all land or none do.
     *
     * @param request    parsed gateway payload
     * @param rawPayload verbatim JSON, stored on the journal row for audit
     * @return MATCHED | PARTIAL | OVERPAID | UNMATCHED | DUPLICATE | IGNORED
     * @throws IllegalArgumentException if the payload carries no transaction id
     *
     * Validate, in order:
     *   1. transaction id present — without it idempotency is impossible
     *   2. DUPLICATE — gatewayTxnId already journalled (gateway retry)
     *   3. IGNORED — outgoing transfer, not a patient payment
     *   4. UNMATCHED — no invoice code in the memo, or no such invoice,
     *      or the invoice was cancelled (needs a manual refund)
     *   5. DUPLICATE — the invoice was already PAID
     *   6. BR-10 — TỔNG tiền đã nhận (cộng dồn các lần chuyển trước + lần này) phải
     *      phủ được tổng hóa đơn, nếu chưa thì ghi PARTIAL và hóa đơn chuyển
     *      PARTIALLY_PAID (không bao giờ PAID)
     */
    @Override
    @Transactional
    public String handleWebhook(PaymentWebhookRequest request, String rawPayload) {
        String gatewayTxnId = request.getId();
        // No transaction id means the duplicate guard below cannot work at all.
        if (gatewayTxnId == null || gatewayTxnId.isBlank()) {
            throw new IllegalArgumentException("Webhook thiếu mã giao dịch (id)");
        }

        // ── Step 1: idempotency guard ──────────────────────────────────────────
        // The gateway retries whenever it does not receive a 200 (flaky network,
        // a deploy...). Without this check one transfer could settle repeatedly.
        if (paymentTransactionRepository.existsByGatewayTxnId(gatewayTxnId)) {
            log.info("Webhook trùng, bỏ qua. gatewayTxnId={}", gatewayTxnId);
            return "DUPLICATE";
        }

        PaymentTransaction txn = PaymentTransaction.builder()
                .gatewayTxnId(gatewayTxnId)
                .gateway(request.getGateway())
                .amount(request.getTransferAmount())
                .content(pickContent(request))
                .accountNumber(request.getAccountNumber())
                .referenceCode(request.getReferenceCode())
                .transferType(request.getTransferType())
                .rawPayload(rawPayload)
                .transactionDate(parseTxnDate(request.getTransactionDate()))
                .receivedAt(LocalDateTime.now())
                .build();

        // ── Step 2: only incoming money can settle an invoice ──────────────────
        // An outgoing transfer (a clinic payout) must never touch a patient invoice.
        if (request.getTransferType() != null && !"in".equalsIgnoreCase(request.getTransferType())) {
            txn.setStatus("IGNORED");
            txn.setNote("Giao dịch tiền ra, không liên quan đến thu phí");
            paymentTransactionRepository.save(txn);
            return "IGNORED";
        }

        // ── Step 3: recover the invoice code from the transfer memo ────────────
        // A transfer we cannot attribute is journalled, never discarded, so the
        // money stays traceable for manual reconciliation.
        String invoiceCode = extractInvoiceCode(request);
        if (invoiceCode == null) {
            txn.setStatus("UNMATCHED");
            txn.setNote("Không tìm thấy mã hóa đơn trong nội dung: " + txn.getContent());
            paymentTransactionRepository.save(txn);
            log.warn("Giao dịch không khớp hóa đơn. gatewayTxnId={} content={}",
                    gatewayTxnId, txn.getContent());
            return "UNMATCHED";
        }
        txn.setMatchedInvoiceCode(invoiceCode);

        Optional<Invoice> found = invoiceRepository.findByInvoiceCode(invoiceCode);
        if (found.isEmpty()) {
            txn.setStatus("UNMATCHED");
            txn.setNote("Mã hóa đơn " + invoiceCode + " không tồn tại trong hệ thống");
            paymentTransactionRepository.save(txn);
            return "UNMATCHED";
        }
        Invoice invoice = found.get();
        txn.setInvoice(invoice);

        // ── Step 4: never settle an invoice twice ──────────────────────────────
        // The invoice is already paid, so this whole transfer is money the clinic
        // is not owed — flag the full amount for refund.
        if ("PAID".equals(invoice.getPaymentStatus())) {
            txn.setStatus("DUPLICATE");
            txn.setNote("Hóa đơn " + invoiceCode + " đã ở trạng thái PAID từ trước");
            markRefundRequired(txn);
            paymentTransactionRepository.save(txn);
            log.warn("Nhận tiền cho hóa đơn đã thanh toán — cần hoàn {}. invoiceCode={}",
                    txn.getAmount(), invoiceCode);
            return "DUPLICATE";
        }

        // Money arrived for a voided invoice — BR-09 keeps the cancelled row, so
        // this is traceable, but the whole amount is owed back.
        if ("CANCELLED".equals(invoice.getStatus())) {
            txn.setStatus("UNMATCHED");
            txn.setNote("Hóa đơn " + invoiceCode + " đã bị hủy — cần hoàn tiền cho bệnh nhân");
            markRefundRequired(txn);
            paymentTransactionRepository.save(txn);
            log.warn("Nhận tiền cho hóa đơn đã hủy — cần hoàn {}. invoiceCode={}",
                    txn.getAmount(), invoiceCode);
            return "UNMATCHED";
        }

        // ── Step 5: amount check ───────────────────────────────────────────────
        BigDecimal received = request.getTransferAmount() == null
                ? BigDecimal.ZERO : request.getTransferAmount();
        BigDecimal expected = invoice.getTotalAmount() == null
                ? BigDecimal.ZERO : invoice.getTotalAmount();

        // UC-23 E2 — thanh toán từng phần: cộng dồn với các lần chuyển trước của chính
        // hóa đơn này. BR-10 giữ nguyên tinh thần (chỉ PAID khi ngân hàng xác nhận đủ
        // tiền), chỉ khác ở chỗ "đủ" nay tính trên nhiều lần chuyển.
        BigDecimal previouslyReceived = paymentTransactionRepository
                .sumReceivedForInvoice(invoice.getId());
        if (previouslyReceived == null) previouslyReceived = BigDecimal.ZERO;
        BigDecimal totalReceived = previouslyReceived.add(received);

        // Chưa đủ: PARTIALLY_PAID phân biệt "đã trả một phần" với "chưa chuyển gì"
        // (PENDING_PAYMENT) và "đã trả đủ" (PAID).
        if (totalReceived.compareTo(expected) < 0) {
            BigDecimal shortfall = expected.subtract(totalReceived);

            txn.setStatus("PARTIAL");
            txn.setNote("Nhận " + received + ", lũy kế " + totalReceived
                    + "/" + expected + ", còn thiếu " + shortfall);
            paymentTransactionRepository.save(txn);

            // Only the settlement flag moves — never to PAID. The invoice stays
            // outstanding in UC-49/UC-50 reporting, and the VietQR manual-issue
            // guard in issueInvoice still treats it as awaiting the bank.
            invoice.setPaymentStatus("PARTIALLY_PAID");
            invoiceRepository.save(invoice);

            // Báo phần còn thiếu SAU khi cộng dồn, nếu không bệnh nhân bị yêu cầu
            // chuyển thừa.
            notifyShortPayment(invoice, shortfall);

            log.warn("Chuyển thiếu tiền. invoiceCode={} lan_nay={} luy_ke={} can={} thieu={}",
                    invoiceCode, received, totalReceived, expected, shortfall);
            return "PARTIAL";
        }

        // ── Step 6: settle the invoice ─────────────────────────────────────────
        // BR-10 satisfied: the bank confirmed funds covering the full total.
        invoice.setPaymentMethod("VIET_QR");
        invoice.setPaymentReference(request.getReferenceCode() != null
                ? request.getReferenceCode() : gatewayTxnId);
        invoice.setPaymentStatus("PAID");
        invoice.setPaidAt(LocalDateTime.now());
        // UC-23 ALT-2 step 5: a draft is promoted DRAFT → ISSUED once paid; an
        // already-ISSUED invoice keeps its status.
        if ("DRAFT".equals(invoice.getStatus())) {
            invoice.setStatus("ISSUED");
        }

        // UC-23 POST-3: close the visit out as COMPLETED. A cancelled or already
        // completed appointment is left untouched.
        Appointment appt = invoice.getAppointment();
        if (appt != null && appt.getStatus() != AppointmentStatus.CANCELLED
                && appt.getStatus() != AppointmentStatus.COMPLETED) {
            appt.setStatus(AppointmentStatus.COMPLETED);
        }

        // UC-24: e-mail the e-invoice automatically once payment is confirmed.
        boolean hasEmail = invoice.getPatient() != null
                && invoice.getPatient().getEmail() != null
                && !invoice.getPatient().getEmail().isBlank();
        if (hasEmail) {
            invoice.setEmailStatus("SENDING");
        }
        invoiceRepository.save(invoice);
        if (hasEmail) {
            try {
                invoiceMailDispatcher.dispatch(invoice.getId());
            } catch (Exception e) {
                log.warn("Không gửi được email hóa đơn {} sau thanh toán QR: {}",
                        invoiceCode, e.getMessage());
            }
        }

        // An overpayment still settles the invoice — the clinic has been paid in
        // full — but the excess belongs to the patient. Splitting it out of
        // MATCHED is what makes it findable at all: the reconciliation query
        // excludes MATCHED, so an overpayment lumped in there would be invisible
        // to everyone, including accounting.
        //
        // Phần thừa tính trên LŨY KẾ: trả 300k rồi 200k cho hóa đơn 400k là thừa 100k,
        // chứ lần chuyển 200k tự nó không thừa đồng nào.
        BigDecimal excess = totalReceived.subtract(expected);
        if (excess.compareTo(BigDecimal.ZERO) > 0) {
            txn.setStatus("OVERPAID");
            txn.setOverpaidAmount(excess);
            txn.setNote("Đã gạch nợ hóa đơn " + invoiceCode + " (lũy kế " + totalReceived
                    + "/" + expected + ") — bệnh nhân chuyển thừa, cần hoàn lại");
            markRefundRequired(txn);
            log.warn("Chuyển thừa tiền. invoiceCode={} lan_nay={} luy_ke={} can={} thua={}",
                    invoiceCode, received, totalReceived, expected, excess);
        } else {
            txn.setStatus("MATCHED");
            txn.setNote("Đã tự động gạch nợ hóa đơn " + invoiceCode
                    + (previouslyReceived.compareTo(BigDecimal.ZERO) > 0
                            ? " (lũy kế " + totalReceived + "/" + expected + ")" : ""));
        }
        paymentTransactionRepository.save(txn);

        // UC-10 / UC-23 step 5: tell the patient the payment landed. Wrapped in
        // try/catch because a notification failure must not undo a settlement
        // that the bank has already confirmed.
        try {
            Long patientUserId = (invoice.getPatient() != null && invoice.getPatient().getUser() != null)
                    ? invoice.getPatient().getUser().getId() : null;
            if (patientUserId != null) {
                Long apptId = invoice.getAppointment() != null ? invoice.getAppointment().getId() : null;
                notificationService.createForUser(patientUserId,
                        "Thanh toán thành công hóa đơn " + invoiceCode + ". Cảm ơn quý khách!", apptId);
            }
        } catch (Exception e) {
            log.warn("Không tạo được thông báo thanh toán thành công cho hóa đơn {}: {}",
                    invoiceCode, e.getMessage());
        }

        log.info("Tự động xác nhận thanh toán. invoiceCode={} amount={} gatewayTxnId={}",
                invoiceCode, received, gatewayTxnId);
        // Trả đúng trạng thái đã ghi sổ: ca chuyển thừa tuy tất toán được hóa đơn nhưng
        // vẫn còn nợ tiền hoàn, bên gọi cần phân biệt.
        return txn.getStatus();
    }

    /**
     * Current settlement state of an invoice, for the QR-screen polling loop
     * (UC-23 ALT-2 step 4).
     *
     * {@code paidAmount} is taken from the most recent MATCHED journal entry,
     * so it reflects what the bank actually reported rather than what was owed.
     *
     * @param invoiceId invoice being paid
     * @return the payment state
     * @throws ResourceNotFoundException if no such invoice
     */
    @Override
    @Transactional(readOnly = true)
    public PaymentStatusResponse getPaymentStatus(Long invoiceId) {
        Invoice invoice = invoiceRepository.findById(invoiceId)
                .orElseThrow(() -> new ResourceNotFoundException("Hóa đơn không tồn tại: " + invoiceId));

        // Tổng qua MỌI lần chuyển: con số của một lần chuyển không nói lên được bệnh
        // nhân đã trả tới đâu.
        BigDecimal paidAmount = paymentTransactionRepository.sumReceivedForInvoice(invoiceId);
        if (paidAmount == null) paidAmount = BigDecimal.ZERO;

        BigDecimal total = invoice.getTotalAmount() != null
                ? invoice.getTotalAmount() : BigDecimal.ZERO;
        BigDecimal remaining = total.subtract(paidAmount);
        if (remaining.compareTo(BigDecimal.ZERO) < 0) remaining = BigDecimal.ZERO;

        return PaymentStatusResponse.builder()
                .invoiceId(invoice.getId())
                .invoiceCode(invoice.getInvoiceCode())
                .status(invoice.getStatus())
                .paymentStatus(invoice.getPaymentStatus())
                .paid("PAID".equals(invoice.getPaymentStatus()))
                .totalAmount(invoice.getTotalAmount())
                .paidAmount(paidAmount)
                .remainingAmount(remaining)
                .paymentReference(invoice.getPaymentReference())
                .paidAt(invoice.getPaidAt())
                .build();
    }

    /**
     * Lists the transfers a human still has to resolve (UC-23 ALT-2 follow-up).
     *
     * @return the worklist, newest transfer first
     */
    @Override
    @Transactional(readOnly = true)
    public java.util.List<PaymentTransactionResponse> getReconciliationList() {
        return paymentTransactionRepository.findNeedingAttention()
                .stream().map(this::toTxnResponse).toList();
    }

    /**
     * Records a refund that staff performed outside the system.
     *
     * @param transactionId the journalled transfer being refunded
     * @param request       amount returned plus a mandatory note
     * @param actorUserId   staff member confirming
     * @return the updated transaction
     * @throws ResourceNotFoundException if no such transaction
     * @throws IllegalStateException     if already refunded, or the amount
     *                                   exceeds what the bank reported
     */
    @Override
    @Transactional
    public PaymentTransactionResponse confirmRefund(Long transactionId,
                                                    RefundConfirmRequest request,
                                                    Long actorUserId) {
        PaymentTransaction txn = paymentTransactionRepository.findById(transactionId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Giao dịch không tồn tại: " + transactionId));

        // One transfer cannot be paid back twice — guard before writing anything.
        if ("DONE".equals(txn.getRefundStatus())) {
            throw new IllegalStateException("Giao dịch này đã được hoàn tiền trước đó");
        }

        // The clinic cannot return more than the bank actually delivered.
        BigDecimal received = txn.getAmount() != null ? txn.getAmount() : BigDecimal.ZERO;
        if (request.getRefundAmount().compareTo(received) > 0) {
            throw new IllegalStateException(
                    "Số tiền hoàn (" + request.getRefundAmount() + ") lớn hơn số tiền đã nhận ("
                            + received + ")");
        }

        txn.setRefundStatus("DONE");
        txn.setRefundAmount(request.getRefundAmount());
        txn.setRefundedAt(LocalDateTime.now());
        txn.setRefundedBy(actorUserId);
        txn.setRefundNote(request.getNote());
        paymentTransactionRepository.save(txn);

        notifyRefunded(txn);

        log.info("Đã hoàn tiền {} cho giao dịch {} (gatewayTxnId={}), người xác nhận userId={}",
                request.getRefundAmount(), transactionId, txn.getGatewayTxnId(), actorUserId);
        return toTxnResponse(txn);
    }

    /**
     * Tells the patient the money has been sent back, so they are not left
     * wondering (UC-10 in-app notification).
     *
     * Best-effort, and silently skipped when the transfer was never matched to
     * an invoice — in that case there is no known patient to notify.
     *
     * @param txn the refunded transaction
     */
    private void notifyRefunded(PaymentTransaction txn) {
        Invoice inv = txn.getInvoice();
        if (inv == null || inv.getPatient() == null || inv.getPatient().getUser() == null) return;
        Long patientUserId = inv.getPatient().getUser().getId();
        try {
            String amount = java.text.NumberFormat
                    .getInstance(new java.util.Locale("vi", "VN")).format(txn.getRefundAmount());
            notificationService.createForUser(patientUserId,
                    "Phòng khám đã hoàn lại " + amount + "₫ cho giao dịch chuyển khoản"
                    + (inv.getInvoiceCode() != null ? " của hóa đơn " + inv.getInvoiceCode() : "")
                    + ". Nếu chưa nhận được, vui lòng liên hệ lễ tân.",
                    inv.getAppointment() != null ? inv.getAppointment().getId() : null);
        } catch (Exception e) {
            log.warn("Không tạo được thông báo hoàn tiền cho giao dịch {}: {}",
                    txn.getId(), e.getMessage());
        }
    }

    /**
     * Maps a journalled transfer to its reconciliation-screen representation.
     *
     * @param t the transaction, with {@code invoice.patient} already fetched
     * @return the DTO
     */
    private PaymentTransactionResponse toTxnResponse(PaymentTransaction t) {
        Invoice inv = t.getInvoice();
        return PaymentTransactionResponse.builder()
                .id(t.getId())
                .gatewayTxnId(t.getGatewayTxnId())
                .gateway(t.getGateway())
                .amount(t.getAmount())
                .content(t.getContent())
                .referenceCode(t.getReferenceCode())
                .status(t.getStatus())
                .note(t.getNote())
                .transactionDate(t.getTransactionDate())
                .receivedAt(t.getReceivedAt())
                .invoiceId(inv != null ? inv.getId() : null)
                .matchedInvoiceCode(t.getMatchedInvoiceCode())
                .invoiceTotal(inv != null ? inv.getTotalAmount() : null)
                .patientName(inv != null && inv.getPatient() != null
                        ? inv.getPatient().getFullName() : null)
                .patientPhone(inv != null && inv.getPatient() != null
                        ? inv.getPatient().getPhone() : null)
                .overpaidAmount(t.getOverpaidAmount())
                .refundStatus(t.getRefundStatus())
                .refundAmount(t.getRefundAmount())
                .refundedAt(t.getRefundedAt())
                .refundNote(t.getRefundNote())
                .build();
    }

    /**
     * Flags a transaction as owing money back to the patient.
     *
     * Only informational — it drives the "needs refund" badge and count on the
     * reconciliation screen. ECMS never moves money itself (same principle as
     * payroll in UC-54), so the refund is performed by staff outside the system
     * and recorded afterwards via {@code confirmRefund}.
     *
     * @param txn the journalled transaction, not yet saved
     */
    private void markRefundRequired(PaymentTransaction txn) {
        txn.setRefundStatus("REQUIRED");
    }

    /**
     * Tells the patient their transfer fell short, and by exactly how much
     * (UC-10 in-app notification).
     *
     * Without this a short payment is silent from the patient's side: they
     * believe the bill is settled while the invoice quietly stays outstanding.
     * The shortfall is stated as a number so they can transfer the correct
     * total rather than guessing.
     *
     * Best-effort: a notification failure must not abort the journalling and
     * status update that already succeeded.
     *
     * @param invoice   the invoice still unsettled, now PAYMENT_FAILED
     * @param shortfall how much of the total is still missing
     */
    private void notifyShortPayment(Invoice invoice, BigDecimal shortfall) {
        Long patientUserId = (invoice.getPatient() != null && invoice.getPatient().getUser() != null)
                ? invoice.getPatient().getUser().getId() : null;
        if (patientUserId == null) return;
        try {
            String amount = java.text.NumberFormat
                    .getInstance(new java.util.Locale("vi", "VN")).format(shortfall);
            Long apptId = invoice.getAppointment() != null ? invoice.getAppointment().getId() : null;
            notificationService.createForUser(patientUserId,
                    "Hóa đơn " + invoice.getInvoiceCode() + " chưa thanh toán đủ — còn thiếu "
                            + amount + "₫. Vui lòng chuyển khoản lại đủ tổng số tiền của hóa đơn, "
                            + "hoặc liên hệ lễ tân để được hỗ trợ.", apptId);
        } catch (Exception e) {
            log.warn("Không tạo được thông báo chuyển thiếu tiền cho hóa đơn {}: {}",
                    invoice.getInvoiceCode(), e.getMessage());
        }
    }

    /**
     * Picks the transfer memo, tolerating gateways that populate
     * {@code description} instead of {@code content}.
     *
     * @param r webhook payload
     * @return the memo text, or null when neither field is set
     */
    private String pickContent(PaymentWebhookRequest r) {
        if (r.getContent() != null && !r.getContent().isBlank()) return r.getContent();
        return r.getDescription();
    }

    /**
     * Extracts the invoice code from a webhook payload.
     *
     * Prefers the gateway's own pre-parsed {@code code} field when its prefix
     * rule is configured, and otherwise falls back to regex-scanning the memo
     * and then the description.
     *
     * @param r webhook payload
     * @return normalised invoice code, or null when none can be found — which
     *         is what drives the UNMATCHED outcome
     */
    private String extractInvoiceCode(PaymentWebhookRequest r) {
        String fromCode = normalizeInvoiceCode(r.getCode());
        if (fromCode != null) return fromCode;

        String fromContent = normalizeInvoiceCode(pickContent(r));
        if (fromContent != null) return fromContent;

        return normalizeInvoiceCode(r.getDescription());
    }

    /**
     * Normalises whatever the bank produced back into the stored format
     * INV-yyyyMMdd-XXXX, so a memo that lost its hyphens still matches.
     *
     * @param text memo or code fragment, may be null
     * @return the canonical invoice code, or null when no code is present
     */
    private String normalizeInvoiceCode(String text) {
        if (text == null || text.isBlank()) return null;
        Matcher m = INVOICE_CODE_PATTERN.matcher(text);
        if (!m.find()) return null;
        return "INV-" + m.group(1) + "-" + m.group(2);
    }

    /**
     * Parses the gateway's "yyyy-MM-dd HH:mm:ss" timestamp.
     *
     * @param raw timestamp string, may be null or malformed
     * @return the parsed value, or null — an unparseable date is not worth
     *         rejecting a real payment over, and {@code receivedAt} still
     *         records when ECMS saw it
     */
    private LocalDateTime parseTxnDate(String raw) {
        if (raw == null || raw.isBlank()) return null;
        try {
            return LocalDateTime.parse(raw.trim(), TXN_DATE_FMT);
        } catch (Exception e) {
            log.debug("Không parse được transactionDate: {}", raw);
            return null;
        }
    }
}
