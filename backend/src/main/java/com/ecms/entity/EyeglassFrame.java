package com.ecms.entity;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;

@Entity
@Table(name = "eyeglass_frames")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class EyeglassFrame {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(columnDefinition = "NVARCHAR(150)", nullable = false)
    private String name;

    @Column(columnDefinition = "NVARCHAR(100)")
    private String brand;

    @Column(columnDefinition = "NVARCHAR(100)")
    private String material;

    @Column(columnDefinition = "NVARCHAR(50)")
    private String color;

    @Column(precision = 15, scale = 2, nullable = false)
    private BigDecimal price;

    @Column(name = "stock_quantity")
    private Integer stockQuantity;

    @Column(length = 20)
    private String status;

    @PrePersist
    protected void onCreate() {
        if (stockQuantity == null) stockQuantity = 0;
        if (status == null) status = "ACTIVE";
    }
}
