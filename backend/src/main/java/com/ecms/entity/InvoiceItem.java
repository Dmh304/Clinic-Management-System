package com.ecms.entity;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;

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

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "invoice_id", nullable = false)
    private Invoice invoice;

    // SERVICE | MEDICINE | GLASSES | LAB | OTHER
    @Column(name = "item_type", nullable = false, length = 20)
    private String itemType;

    // Polymorphic FK — trỏ đến service_id, medicine_id,... (validate ở tầng Service)
    @Column(name = "ref_id")
    private Long refId;

    @Column(name = "description", nullable = false, columnDefinition = "NVARCHAR(500)")
    private String description;

    @Column(name = "quantity", nullable = false)
    private Integer quantity;

    @Column(name = "unit_price", precision = 12, scale = 2)
    private BigDecimal unitPrice;

    @Column(name = "sub_total", precision = 12, scale = 2)
    private BigDecimal subtotal;

    @PrePersist
    private void prePersist() {
        if (quantity == null) quantity = 1;
        if (unitPrice == null) unitPrice = BigDecimal.ZERO;
        if (subtotal == null) subtotal = BigDecimal.ZERO;
    }
}
