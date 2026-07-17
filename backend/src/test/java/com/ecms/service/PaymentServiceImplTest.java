// ThangNBHE201024 - HE187030
// Kiểm thử logic đối soát thanh toán tự động (UC-22).
// Tập trung vào các tình huống dễ gây mất tiền hoặc gạch nợ sai:
//  - Cổng bắn webhook trùng
//  - Nội dung chuyển khoản bị app ngân hàng viết hoa / mất dấu gạch ngang
//  - Bệnh nhân chuyển thiếu tiền
//  - Sai API key
package com.ecms.service;

import com.ecms.dto.request.PaymentWebhookRequest;
import com.ecms.entity.Invoice;
import com.ecms.repository.InvoiceRepository;
import com.ecms.repository.PaymentTransactionRepository;
import com.ecms.service.impl.PaymentServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.math.BigDecimal;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class PaymentServiceImplTest {

    @Mock
    private InvoiceRepository invoiceRepository;

    @Mock
    private PaymentTransactionRepository paymentTransactionRepository;

    @InjectMocks
    private PaymentServiceImpl paymentService;

    private static final String API_KEY = "test-api-key";

    @BeforeEach
    void setUp() {
        ReflectionTestUtils.setField(paymentService, "webhookApiKey", API_KEY);
    }

    private Invoice draftInvoice(String code, String amount) {
        Invoice inv = new Invoice();
        inv.setId(1L);
        inv.setInvoiceCode(code);
        inv.setTotalAmount(new BigDecimal(amount));
        inv.setStatus("DRAFT");
        inv.setPaymentStatus("UNPAID");
        return inv;
    }

    private PaymentWebhookRequest webhook(String txnId, String content, String amount) {
        PaymentWebhookRequest r = new PaymentWebhookRequest();
        r.setId(txnId);
        r.setGateway("Vietcombank");
        r.setTransferType("in");
        r.setContent(content);
        r.setTransferAmount(new BigDecimal(amount));
        r.setReferenceCode("MBVCB.123");
        return r;
    }

    @Test
    @DisplayName("Chuyển khoản đúng mã và đủ tiền thì hóa đơn được gạch nợ tự động")
    void matchesInvoiceAndMarksPaid() {
        Invoice inv = draftInvoice("INV-20250717-0001", "350000");
        when(paymentTransactionRepository.existsByGatewayTxnId("92704")).thenReturn(false);
        when(invoiceRepository.findByInvoiceCode("INV-20250717-0001")).thenReturn(Optional.of(inv));

        String result = paymentService.handleWebhook(
                webhook("92704", "Thanh toan INV-20250717-0001", "350000"), "{}");

        assertThat(result).isEqualTo("MATCHED");

        ArgumentCaptor<Invoice> saved = ArgumentCaptor.forClass(Invoice.class);
        verify(invoiceRepository).save(saved.capture());
        assertThat(saved.getValue().getPaymentStatus()).isEqualTo("PAID");
        // Hóa đơn nháp phải được phát hành luôn khi tiền đã về
        assertThat(saved.getValue().getStatus()).isEqualTo("ISSUED");
        assertThat(saved.getValue().getPaymentMethod()).isEqualTo("VIET_QR");
        assertThat(saved.getValue().getPaidAt()).isNotNull();
        // Mã tham chiếu phải lấy từ ngân hàng, không phải do lễ tân nhập tay
        assertThat(saved.getValue().getPaymentReference()).isEqualTo("MBVCB.123");
    }

    @Test
    @DisplayName("App ngân hàng viết hoa và bỏ dấu gạch ngang thì vẫn dò ra mã hóa đơn")
    void extractsInvoiceCodeFromNoisyContent() {
        Invoice inv = draftInvoice("INV-20250717-0001", "350000");
        when(invoiceRepository.findByInvoiceCode("INV-20250717-0001")).thenReturn(Optional.of(inv));

        String result = paymentService.handleWebhook(
                webhook("1", "CT DEN:970436 THANH TOAN INV202507170001 GD 123", "350000"), "{}");

        assertThat(result).isEqualTo("MATCHED");
    }

    @Test
    @DisplayName("Cổng bắn lại cùng một giao dịch thì bỏ qua, không gạch nợ lần hai")
    void duplicateWebhookIsIgnored() {
        when(paymentTransactionRepository.existsByGatewayTxnId("92704")).thenReturn(true);

        String result = paymentService.handleWebhook(
                webhook("92704", "Thanh toan INV-20250717-0001", "350000"), "{}");

        assertThat(result).isEqualTo("DUPLICATE");
        // Không được đụng vào hóa đơn, cũng không ghi thêm bản ghi giao dịch
        verify(invoiceRepository, never()).save(any());
        verify(paymentTransactionRepository, never()).save(any());
    }

    @Test
    @DisplayName("Chuyển thiếu tiền thì không đánh dấu đã thanh toán")
    void underpaymentDoesNotMarkPaid() {
        Invoice inv = draftInvoice("INV-20250717-0001", "350000");
        when(invoiceRepository.findByInvoiceCode("INV-20250717-0001")).thenReturn(Optional.of(inv));

        String result = paymentService.handleWebhook(
                webhook("92705", "Thanh toan INV-20250717-0001", "100000"), "{}");

        assertThat(result).isEqualTo("AMOUNT_MISMATCH");
        verify(invoiceRepository, never()).save(any());
        assertThat(inv.getPaymentStatus()).isEqualTo("UNPAID");
    }

    @Test
    @DisplayName("Nội dung không có mã hóa đơn thì vẫn ghi nhật ký để kế toán đối soát tay")
    void unmatchedTransactionIsStillLogged() {
        String result = paymentService.handleWebhook(
                webhook("92706", "chuyen tien an trua", "50000"), "{}");

        assertThat(result).isEqualTo("UNMATCHED");
        // Không được im lặng bỏ qua: tiền đã vào tài khoản thật
        verify(paymentTransactionRepository).save(any());
        verify(invoiceRepository, never()).save(any());
    }

    @Test
    @DisplayName("Hóa đơn đã thanh toán thì webhook sau không gạch nợ lần nữa")
    void alreadyPaidInvoiceIsNotPaidTwice() {
        Invoice inv = draftInvoice("INV-20250717-0001", "350000");
        inv.setPaymentStatus("PAID");
        when(invoiceRepository.findByInvoiceCode("INV-20250717-0001")).thenReturn(Optional.of(inv));

        String result = paymentService.handleWebhook(
                webhook("92707", "Thanh toan INV-20250717-0001", "350000"), "{}");

        assertThat(result).isEqualTo("DUPLICATE");
        verify(invoiceRepository, never()).save(any());
    }

    @Test
    @DisplayName("Giao dịch tiền ra bị bỏ qua, không ảnh hưởng hóa đơn")
    void outgoingTransferIsIgnored() {
        PaymentWebhookRequest r = webhook("92708", "Thanh toan INV-20250717-0001", "350000");
        r.setTransferType("out");

        String result = paymentService.handleWebhook(r, "{}");

        assertThat(result).isEqualTo("IGNORED");
        verify(invoiceRepository, never()).save(any());
    }

    @Test
    @DisplayName("Sai hoặc thiếu API key thì webhook bị từ chối")
    void rejectsWrongApiKey() {
        assertThat(paymentService.isValidApiKey("Apikey " + API_KEY)).isTrue();
        assertThat(paymentService.isValidApiKey("Apikey sai-key")).isFalse();
        assertThat(paymentService.isValidApiKey("Bearer " + API_KEY)).isFalse();
        assertThat(paymentService.isValidApiKey(null)).isFalse();
        assertThat(paymentService.isValidApiKey("")).isFalse();
    }

    @Test
    @DisplayName("Chưa cấu hình API key thì từ chối tất cả, không chạy webhook không bảo vệ")
    void rejectsEverythingWhenApiKeyNotConfigured() {
        ReflectionTestUtils.setField(paymentService, "webhookApiKey", "");
        assertThat(paymentService.isValidApiKey("Apikey bat-ky")).isFalse();
    }

    @Test
    @DisplayName("Webhook thiếu mã giao dịch thì báo lỗi thay vì xử lý mù")
    void rejectsWebhookWithoutTxnId() {
        PaymentWebhookRequest r = webhook(null, "Thanh toan INV-20250717-0001", "350000");

        try {
            paymentService.handleWebhook(r, "{}");
            assertThat(false).as("Phải ném IllegalArgumentException").isTrue();
        } catch (IllegalArgumentException e) {
            assertThat(e.getMessage()).contains("mã giao dịch");
        }
    }

    @Test
    @DisplayName("Hóa đơn QR đang chờ chuyển khoản (PENDING_PAYMENT) vẫn được gạch nợ bình thường")
    void pendingPaymentInvoiceGetsPaid() {
        Invoice inv = draftInvoice("INV-20250717-0001", "350000");
        // Trạng thái hóa đơn QR ngay sau khi lễ tân bấm "Tạo mã QR"
        inv.setPaymentStatus("PENDING_PAYMENT");
        when(invoiceRepository.findByInvoiceCode("INV-20250717-0001")).thenReturn(Optional.of(inv));

        String result = paymentService.handleWebhook(
                webhook("92710", "Thanh toan INV-20250717-0001", "350000"), "{}");

        assertThat(result).isEqualTo("MATCHED");
        assertThat(inv.getPaymentStatus()).isEqualTo("PAID");
        assertThat(inv.getStatus()).isEqualTo("ISSUED");
    }

    @Test
    @DisplayName("Chuyển dư tiền vẫn được chấp nhận, không chặn bệnh nhân")
    void overpaymentIsAccepted() {
        Invoice inv = draftInvoice("INV-20250717-0001", "350000");
        when(invoiceRepository.findByInvoiceCode("INV-20250717-0001")).thenReturn(Optional.of(inv));

        String result = paymentService.handleWebhook(
                webhook("92711", "Thanh toan INV-20250717-0001", "400000"), "{}");

        assertThat(result).isEqualTo("MATCHED");
        assertThat(inv.getPaymentStatus()).isEqualTo("PAID");
    }

    @Test
    @DisplayName("Tiền vào cho hóa đơn đã hủy thì cảnh báo để hoàn tiền thủ công")
    void paymentForCancelledInvoiceIsFlagged() {
        Invoice inv = draftInvoice("INV-20250717-0001", "350000");
        inv.setStatus("CANCELLED");
        when(invoiceRepository.findByInvoiceCode("INV-20250717-0001")).thenReturn(Optional.of(inv));

        String result = paymentService.handleWebhook(
                webhook("92709", "Thanh toan INV-20250717-0001", "350000"), "{}");

        assertThat(result).isEqualTo("UNMATCHED");
        verify(invoiceRepository, never()).save(any());
        verify(paymentTransactionRepository).save(any());
    }
}
