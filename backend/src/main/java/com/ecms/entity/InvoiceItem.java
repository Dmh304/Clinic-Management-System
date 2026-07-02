// DucTKH
// Entity đại diện cho bảng invoice_details trong cơ sở dữ liệu.
// Dùng để lưu trữ chi tiết từng mục trong hóa đơn (thuốc, dịch vụ, v.v.).
// ThangNBHE201024
// Entity ánh xạ bảng "invoice_details" — lưu từng dòng chi tiết của hóa đơn.
// Mỗi InvoiceItem tương ứng một khoản phí: dịch vụ khám, xét nghiệm, thuốc hoặc kính.
// @PrePersist đảm bảo quantity, unitPrice, subtotal không bao giờ NULL khi INSERT.
package com.ecms.entity;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;


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

    // Gán giá trị mặc định trước khi INSERT để tránh lỗi NOT NULL từ DB
    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        if (status == null) status = "ACTIVE";
        if (unitPrice == null) unitPrice = BigDecimal.ZERO;
        if (subTotal == null) subTotal = BigDecimal.ZERO;
        if (quantity == null) quantity = 1;
    }
}
