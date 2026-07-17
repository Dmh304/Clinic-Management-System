// ThangNBHE201024 - HE187030
// Kiểm thử ràng buộc: hóa đơn QR đang chờ ngân hàng KHÔNG được phát hành tay (UC-22).
//
// Vì sao cần test riêng: bảo đảm "chỉ ngân hàng mới gạch nợ được" trước đây chỉ là quy ước
// phía frontend (React không gọi endpoint issue cho nhánh QR). Backend vẫn mở, nên chỉ cần
// một cú curl là đánh dấu PAID được mà không có tiền thật. Test này khóa hành vi đó lại.
package com.ecms.service;

import com.ecms.entity.Invoice;
import com.ecms.repository.AppointmentRepository;
import com.ecms.repository.InvoiceRepository;
import com.ecms.service.impl.InvoiceServiceImpl;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mail.javamail.JavaMailSender;

import java.math.BigDecimal;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class InvoiceIssueGuardTest {

    @Mock private InvoiceRepository invoiceRepository;
    @Mock private AppointmentRepository appointmentRepository;
    @Mock private JavaMailSender mailSender;
    @Mock private InvoicePdfService invoicePdfService;

    @InjectMocks private InvoiceServiceImpl invoiceService;

    private Invoice qrInvoiceWaitingForBank() {
        Invoice inv = new Invoice();
        inv.setId(1L);
        inv.setInvoiceCode("INV-20250717-0001");
        inv.setTotalAmount(new BigDecimal("350000"));
        inv.setStatus("DRAFT");
        inv.setPaymentStatus("PENDING_PAYMENT");
        inv.setPaymentMethod("VIET_QR");
        return inv;
    }

    @Test
    @DisplayName("Lễ tân KHÔNG thể tự phát hành hóa đơn QR đang chờ ngân hàng")
    void cannotManuallyIssueQrInvoiceAwaitingBank() {
        Invoice inv = qrInvoiceWaitingForBank();
        when(invoiceRepository.findById(1L)).thenReturn(Optional.of(inv));

        assertThatThrownBy(() -> invoiceService.issueInvoice(1L, "VIET_QR", "tu-nhap-bay"))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("cổng ngân hàng");

        // Không được ghi bất cứ thay đổi nào xuống DB
        verify(invoiceRepository, never()).save(any());
        assertThat(inv.getPaymentStatus()).isEqualTo("PENDING_PAYMENT");
    }

    @Test
    @DisplayName("Bỏ trống paymentMethod cũng không lách được: hóa đơn vốn đã là VIET_QR")
    void cannotBypassGuardByOmittingPaymentMethod() {
        Invoice inv = qrInvoiceWaitingForBank();
        when(invoiceRepository.findById(1L)).thenReturn(Optional.of(inv));

        assertThatThrownBy(() -> invoiceService.issueInvoice(1L, null, null))
                .isInstanceOf(IllegalStateException.class);

        verify(invoiceRepository, never()).save(any());
    }

    @Test
    @DisplayName("Bệnh nhân bỏ QR quay lại trả tiền mặt: vẫn phát hành được với CASH")
    void canFallBackToCashPayment() {
        Invoice inv = qrInvoiceWaitingForBank();
        when(invoiceRepository.findById(1L)).thenReturn(Optional.of(inv));
        when(invoiceRepository.save(any(Invoice.class))).thenAnswer(a -> a.getArgument(0));

        invoiceService.issueInvoice(1L, "CASH", null);

        // Có lễ tân cầm tiền chịu trách nhiệm nên đây là luồng hợp lệ
        assertThat(inv.getPaymentStatus()).isEqualTo("PAID");
        assertThat(inv.getStatus()).isEqualTo("ISSUED");
        assertThat(inv.getPaymentMethod()).isEqualTo("CASH");
    }

    @Test
    @DisplayName("Hóa đơn tiền mặt thông thường không bị ràng buộc mới làm ảnh hưởng")
    void normalCashInvoiceStillIssuesFine() {
        Invoice inv = new Invoice();
        inv.setId(2L);
        inv.setStatus("DRAFT");
        inv.setPaymentStatus("UNPAID");
        inv.setTotalAmount(new BigDecimal("200000"));
        when(invoiceRepository.findById(2L)).thenReturn(Optional.of(inv));
        when(invoiceRepository.save(any(Invoice.class))).thenAnswer(a -> a.getArgument(0));

        invoiceService.issueInvoice(2L, "CASH", null);

        assertThat(inv.getPaymentStatus()).isEqualTo("PAID");
        assertThat(inv.getStatus()).isEqualTo("ISSUED");
    }
}
