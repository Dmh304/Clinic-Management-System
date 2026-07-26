package com.ecms.entity;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;


/**
 * @author      ThangNB - HE201024
 * @contributor Thái Khắc Hữu Đức - HE204463, Đồng Mạnh Hùng - HE200743
 * @created     2026-05-31
 * @updated     2026-07-02
 *
 * Maps the {@code invoice_details} table — one row per charge line of an
 * invoice: consultation service, lab test, medicine or eyeglasses (UC-23).
 *
 * Each line stores its own unit price rather than joining back to the
 * catalogue, so a later price change never alters an already-issued invoice
 * (UC-58 assumption: "price changes do not retroactively affect PAID invoices").
 */
@Entity
@Table(name = "invoice_details")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class InvoiceItem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // Hóa đơn cha — quan hệ nhiều dòng thuộc một hóa đơn
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "invoice_id", nullable = false)
    private Invoice invoice;

    // Loại khoản phí: SERVICE | MEDICINE | GLASSES | LAB | OTHER
    @Column(name = "item_type", nullable = false, length = 20)
    private String itemType;

    // Polymorphic FK - trỏ đến service_id, medicine_id,... (validate ở tầng Service)
    @Column(name = "ref_id")
    private Long refId;

    // Tên dịch vụ / thuốc hiển thị trên hóa đơn
    @Column(name = "description", nullable = false, columnDefinition = "NVARCHAR(500)")
    private String description;

    // Số lượng sử dụng (mặc định 1 nếu không truyền)
    @Column(name = "quantity", nullable = false)
    private Integer quantity;

    // Đơn giá (VNĐ)
    @Column(name = "unit_price", nullable = false, precision = 12, scale = 2)
    private BigDecimal unitPrice;

    // Thành tiền = quantity × unitPrice; ánh xạ cột sub_total trong DB
    @Column(name = "sub_total", nullable = false, precision = 12, scale = 2)
    private BigDecimal subTotal;

    @Column(nullable = false)
    private String status;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    /**
     * Fills defaults before INSERT so the NOT NULL constraints on
     * quantity / unit_price / sub_total can never be violated by a caller
     * that omitted an optional field.
     *
     * Validate: BR-11 — a missing amount must default to 0 (never NULL),
     * otherwise the invoice total would evaluate to NULL instead of a number.
     */
    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        if (status == null) status = "ACTIVE";
        if (unitPrice == null) unitPrice = BigDecimal.ZERO;
        if (subTotal == null) subTotal = BigDecimal.ZERO;
        if (quantity == null) quantity = 1;
    }
}
