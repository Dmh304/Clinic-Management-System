// ThangNBHE201024 - HE187030
// DTO trả về trạng thái thanh toán của một hóa đơn.
// Frontend gọi định kỳ (polling 3s) trong lúc hiển thị mã QR để biết bệnh nhân
// đã chuyển khoản xong hay chưa, mà không cần lễ tân bấm xác nhận thủ công.
package com.ecms.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PaymentStatusResponse {

    private Long invoiceId;

    private String invoiceCode;

    // DRAFT | ISSUED | CANCELLED
    private String status;

    // UNPAID | PENDING_PAYMENT | PAID | PAYMENT_FAILED
    private String paymentStatus;

    // true khi paymentStatus = PAID — frontend chỉ cần đọc cờ này để dừng polling
    private boolean paid;

    private BigDecimal totalAmount;

    // Số tiền cổng thanh toán báo về (null nếu chưa có giao dịch nào)
    private BigDecimal paidAmount;

    // Mã giao dịch ngân hàng khớp với hóa đơn này
    private String paymentReference;

    private LocalDateTime paidAt;
}
