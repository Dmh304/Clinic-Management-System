// DucTKH
// Entity đại diện cho bảng prescription_items trong cơ sở dữ liệu.
// Lưu chi tiết từng loại thuốc trong một đơn thuốc cụ thể.
package com.ecms.entity;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;

@Entity
@Table(name = "prescription_items")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class PrescriptionItem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "prescription_id", nullable = false)
    private Prescription prescription;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "medicine_id", nullable = false)
    private Medicine medicine;

    @Column(nullable = false)
    private Integer quantity;

    @Column(nullable = false)
    private String dosage;

    @Column(nullable = false)
    private String frequency;

    @Column(nullable = false)
    private Integer duration; // in days

    @Column(columnDefinition = "NVARCHAR(200)")
    private String instructions;

    @Column(name = "unit_price", precision = 10, scale = 2)
    private BigDecimal unitPrice;
}
