// ThangNBHE201024 - HE187030
// Triển khai đối soát thanh toán tự động cho luồng VietQR (UC-22).
//
// Luồng đầy đủ:
//  1. Lễ tân tạo hóa đơn nháp → hệ thống sinh mã INV-yyyyMMdd-XXXX.
//  2. Mã QR được sinh với nội dung chuyển khoản chứa đúng mã hóa đơn đó.
//  3. Bệnh nhân quét QR và chuyển khoản; app ngân hàng giữ nguyên nội dung.
//  4. Tiền vào tài khoản phòng khám → cổng (SePay) POST webhook về ECMS.
//  5. Hệ thống dò mã hóa đơn trong nội dung, đối chiếu số tiền, rồi tự gạch nợ.
//
// Nguyên tắc an toàn:
//  - Idempotency: gatewayTxnId là UNIQUE; cổng bắn lặp lần 2 sẽ dừng ngay ở bước kiểm tra.
//  - Không bao giờ mất dấu tiền: giao dịch không khớp vẫn được ghi với status UNMATCHED
//    để kế toán đối soát tay, thay vì trả 200 rồi bỏ qua âm thầm.
//  - Chỉ gạch nợ khi số tiền nhận >= tổng hóa đơn; thiếu tiền → AMOUNT_MISMATCH, không PAID.
package com.ecms.service.impl;

import com.ecms.dto.request.PaymentWebhookRequest;
import com.ecms.dto.response.PaymentStatusResponse;
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

@Slf4j
@Service
@RequiredArgsConstructor
public class PaymentServiceImpl implements PaymentService {

    private final InvoiceRepository invoiceRepository;
    private final PaymentTransactionRepository paymentTransactionRepository;

    // API key cổng thanh toán phải gửi kèm header: Authorization: Apikey <key>
    @Value("${payment.webhook.api-key:}")
    private String webhookApiKey;

    // Dò mã hóa đơn trong nội dung chuyển khoản. App ngân hàng thường viết hoa toàn bộ
    // và xóa dấu gạch ngang, nên chấp nhận cả "INV-20250717-0001" lẫn "INV202507170001".
    private static final Pattern INVOICE_CODE_PATTERN =
            Pattern.compile("INV[-\\s]?(\\d{8})[-\\s]?(\\d{4})", Pattern.CASE_INSENSITIVE);

    private static final DateTimeFormatter TXN_DATE_FMT =
            DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");

    @Override
    public boolean isValidApiKey(String authorizationHeader) {
        // Chưa cấu hình key → từ chối tất cả. Không cho phép chạy webhook không bảo vệ,
        // vì bất kỳ ai biết URL cũng có thể tự đánh dấu hóa đơn đã thanh toán.
        if (webhookApiKey == null || webhookApiKey.isBlank()) {
            log.error("payment.webhook.api-key chưa được cấu hình — từ chối mọi webhook");
            return false;
        }
        if (authorizationHeader == null || authorizationHeader.isBlank()) {
            return false;
        }
        String expected = "Apikey " + webhookApiKey;
        // So sánh theo thời gian hằng số để tránh lộ key qua timing attack
        return java.security.MessageDigest.isEqual(
                authorizationHeader.trim().getBytes(java.nio.charset.StandardCharsets.UTF_8),
                expected.getBytes(java.nio.charset.StandardCharsets.UTF_8));
    }

    @Override
    @Transactional
    public String handleWebhook(PaymentWebhookRequest request, String rawPayload) {
        String gatewayTxnId = request.getId();
        if (gatewayTxnId == null || gatewayTxnId.isBlank()) {
            throw new IllegalArgumentException("Webhook thiếu mã giao dịch (id)");
        }

        // ── Bước 1: chống xử lý trùng ──────────────────────────────────────────
        // Cổng thanh toán retry khi không nhận được 200 (mạng chập chờn, deploy...).
        // Nếu không chặn ở đây, cùng một lần chuyển khoản có thể gạch nợ nhiều hóa đơn.
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

        // ── Bước 2: chỉ quan tâm tiền vào ──────────────────────────────────────
        if (request.getTransferType() != null && !"in".equalsIgnoreCase(request.getTransferType())) {
            txn.setStatus("IGNORED");
            txn.setNote("Giao dịch tiền ra, không liên quan đến thu phí");
            paymentTransactionRepository.save(txn);
            return "IGNORED";
        }

        // ── Bước 3: dò mã hóa đơn trong nội dung chuyển khoản ──────────────────
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

        // ── Bước 4: hóa đơn đã thanh toán rồi thì không gạch nợ lần nữa ────────
        if ("PAID".equals(invoice.getPaymentStatus())) {
            txn.setStatus("DUPLICATE");
            txn.setNote("Hóa đơn " + invoiceCode + " đã ở trạng thái PAID từ trước");
            paymentTransactionRepository.save(txn);
            return "DUPLICATE";
        }

        if ("CANCELLED".equals(invoice.getStatus())) {
            txn.setStatus("UNMATCHED");
            txn.setNote("Hóa đơn " + invoiceCode + " đã bị hủy — cần hoàn tiền thủ công");
            paymentTransactionRepository.save(txn);
            log.warn("Nhận tiền cho hóa đơn đã hủy. invoiceCode={}", invoiceCode);
            return "UNMATCHED";
        }

        // ── Bước 5: đối chiếu số tiền ─────────────────────────────────────────
        BigDecimal received = request.getTransferAmount() == null
                ? BigDecimal.ZERO : request.getTransferAmount();
        BigDecimal expected = invoice.getTotalAmount() == null
                ? BigDecimal.ZERO : invoice.getTotalAmount();

        if (received.compareTo(expected) < 0) {
            txn.setStatus("AMOUNT_MISMATCH");
            txn.setNote("Số tiền nhận " + received + " nhỏ hơn tổng hóa đơn " + expected);
            paymentTransactionRepository.save(txn);
            log.warn("Chuyển thiếu tiền. invoiceCode={} nhan={} can={}", invoiceCode, received, expected);
            return "AMOUNT_MISMATCH";
        }

        // ── Bước 6: gạch nợ ───────────────────────────────────────────────────
        invoice.setPaymentMethod("VIET_QR");
        invoice.setPaymentReference(request.getReferenceCode() != null
                ? request.getReferenceCode() : gatewayTxnId);
        invoice.setPaymentStatus("PAID");
        invoice.setPaidAt(LocalDateTime.now());
        // Hóa đơn nháp được phát hành luôn khi tiền đã về; hóa đơn ISSUED giữ nguyên trạng thái.
        if ("DRAFT".equals(invoice.getStatus())) {
            invoice.setStatus("ISSUED");
        }
        invoiceRepository.save(invoice);

        txn.setStatus("MATCHED");
        txn.setNote("Đã tự động gạch nợ hóa đơn " + invoiceCode);
        paymentTransactionRepository.save(txn);

        log.info("Tự động xác nhận thanh toán. invoiceCode={} amount={} gatewayTxnId={}",
                invoiceCode, received, gatewayTxnId);
        return "MATCHED";
    }

    @Override
    @Transactional(readOnly = true)
    public PaymentStatusResponse getPaymentStatus(Long invoiceId) {
        Invoice invoice = invoiceRepository.findById(invoiceId)
                .orElseThrow(() -> new ResourceNotFoundException("Hóa đơn không tồn tại: " + invoiceId));

        BigDecimal paidAmount = paymentTransactionRepository
                .findByInvoiceIdOrderByReceivedAtDesc(invoiceId)
                .stream()
                .filter(t -> "MATCHED".equals(t.getStatus()))
                .map(PaymentTransaction::getAmount)
                .filter(java.util.Objects::nonNull)
                .findFirst()
                .orElse(null);

        return PaymentStatusResponse.builder()
                .invoiceId(invoice.getId())
                .invoiceCode(invoice.getInvoiceCode())
                .status(invoice.getStatus())
                .paymentStatus(invoice.getPaymentStatus())
                .paid("PAID".equals(invoice.getPaymentStatus()))
                .totalAmount(invoice.getTotalAmount())
                .paidAmount(paidAmount)
                .paymentReference(invoice.getPaymentReference())
                .paidAt(invoice.getPaidAt())
                .build();
    }

    // Một số cổng đẩy nội dung vào description thay vì content — thử cả hai.
    private String pickContent(PaymentWebhookRequest r) {
        if (r.getContent() != null && !r.getContent().isBlank()) return r.getContent();
        return r.getDescription();
    }

    // Ưu tiên field code nếu cổng đã tự bóc tách sẵn theo cấu hình prefix,
    // ngược lại tự dò bằng regex trong nội dung chuyển khoản.
    private String extractInvoiceCode(PaymentWebhookRequest r) {
        String fromCode = normalizeInvoiceCode(r.getCode());
        if (fromCode != null) return fromCode;

        String fromContent = normalizeInvoiceCode(pickContent(r));
        if (fromContent != null) return fromContent;

        return normalizeInvoiceCode(r.getDescription());
    }

    // Chuẩn hóa về đúng định dạng lưu trong DB: INV-yyyyMMdd-XXXX
    private String normalizeInvoiceCode(String text) {
        if (text == null || text.isBlank()) return null;
        Matcher m = INVOICE_CODE_PATTERN.matcher(text);
        if (!m.find()) return null;
        return "INV-" + m.group(1) + "-" + m.group(2);
    }

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
