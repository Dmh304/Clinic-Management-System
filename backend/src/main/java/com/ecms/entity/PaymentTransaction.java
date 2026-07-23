// ThangNBHE201024 - HE187030
// Entity đại diện cho bảng payment_transactions: lưu lại mọi giao dịch chuyển khoản
// do cổng thanh toán (SePay/Casso) đẩy về qua webhook.
//
// Vai trò:
//  - Nhật ký đối soát: giữ nguyên payload gốc của cổng để tra cứu khi có tranh chấp.
//  - Chống ghi trùng (idempotency): gateway_txn_id là UNIQUE, cổng bắn lặp cũng chỉ ghi 1 lần.
//  - Truy vết: một giao dịch không khớp hóa đơn nào vẫn được lưu với status = UNMATCHED
//    thay vì bị bỏ qua âm thầm, để lễ tân/kế toán xử lý tay.
package com.ecms.entity;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "payment_transactions")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PaymentTransaction {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // Mã giao dịch do cổng thanh toán cấp — UNIQUE để chặn xử lý trùng khi cổng retry
    @Column(name = "gateway_txn_id", nullable = false, unique = true, length = 100)
    private String gatewayTxnId;

    // Tên cổng/ngân hàng gửi webhook (ví dụ: SePay, Vietcombank)
    @Column(name = "gateway", length = 50)
    private String gateway;

    // Hóa đơn được khớp; null khi giao dịch không tìm được hóa đơn tương ứng
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "invoice_id")
    private Invoice invoice;

    // Mã hóa đơn trích ra từ nội dung chuyển khoản (INV-yyyyMMdd-XXXX)
    @Column(name = "matched_invoice_code", length = 30)
    private String matchedInvoiceCode;

    @Column(name = "amount", precision = 12, scale = 2)
    private BigDecimal amount;

    // Nội dung chuyển khoản do người trả nhập — nguồn để dò mã hóa đơn
    @Column(name = "content", length = 500)
    private String content;

    // Số tài khoản nhận tiền
    @Column(name = "account_number", length = 50)
    private String accountNumber;

    // Mã tham chiếu của ngân hàng (ví dụ MBVCB.3278907687)
    @Column(name = "reference_code", length = 100)
    private String referenceCode;

    // in = tiền vào, out = tiền ra. Chỉ giao dịch "in" mới được đối soát.
    @Column(name = "transfer_type", length = 10)
    private String transferType;

    // MATCHED       — khớp hóa đơn và đã gạch nợ thành công
    // UNMATCHED     — không dò được mã hóa đơn trong nội dung chuyển khoản
    // AMOUNT_MISMATCH — khớp hóa đơn nhưng số tiền không đủ
    // DUPLICATE     — hóa đơn đã PAID từ trước
    // IGNORED       — giao dịch tiền ra, không liên quan
    @Column(name = "status", nullable = false, length = 20)
    private String status;

    // Ghi chú lý do khi status khác MATCHED — hiển thị cho kế toán khi đối soát
    @Column(name = "note", length = 500)
    private String note;

    // Payload JSON gốc của cổng — giữ nguyên để đối soát/debug
    @Column(name = "raw_payload", columnDefinition = "NVARCHAR(MAX)")
    private String rawPayload;

    // Thời điểm giao dịch theo cổng báo về
    @Column(name = "transaction_date")
    private LocalDateTime transactionDate;

    // Thời điểm hệ thống ECMS nhận được webhook
    @Column(name = "received_at", nullable = false)
    private LocalDateTime receivedAt;

    @PrePersist
    protected void onCreate() {
        if (receivedAt == null) receivedAt = LocalDateTime.now();
        if (status == null) status = "UNMATCHED";
    }
}
