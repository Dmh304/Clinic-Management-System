package com.ecms.entity;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;

@Entity
@Table(name = "lens_types")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class LensType {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(columnDefinition = "NVARCHAR(100)", nullable = false)
    private String name;

    @Column(columnDefinition = "NVARCHAR(500)")
    private String description;

    @Column(name = "base_price", precision = 15, scale = 2, nullable = false)
    private BigDecimal basePrice;

    @Column(length = 20)
    private String status;

    @PrePersist
    protected void onCreate() {
        if (status == null) status = "ACTIVE";
    }
}
