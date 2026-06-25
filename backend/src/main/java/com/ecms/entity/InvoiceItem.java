// DucTKH
// Entity đại diện cho bảng invoice_details trong cơ sở dữ liệu.
// Dùng để lưu trữ chi tiết từng mục trong hóa đơn (thuốc, dịch vụ, v.v.).
package com.ecms.entity;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "invoice_details")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class InvoiceItem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "invoice_id", nullable = false)
    private Invoice invoice;

    @Column(name = "item_type", nullable = false)
    private String itemType;

    @Column(nullable = false)
    private String description;

    @Column(name = "unit_price", nullable = false)
    private BigDecimal unitPrice;

    @Column(nullable = false)
    private Integer quantity;

    @Column(name = "sub_total", nullable = false)
    private BigDecimal subTotal;

    @Column(name = "ref_id")
    private Long refId;

    @Column(nullable = false)
    private String status;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        if (status == null) status = "ACTIVE";
        if (unitPrice == null) unitPrice = BigDecimal.ZERO;
        if (subTotal == null) subTotal = BigDecimal.ZERO;
        if (quantity == null) quantity = 1;
    }
}
