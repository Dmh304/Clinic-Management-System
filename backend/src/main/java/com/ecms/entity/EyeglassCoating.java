package com.ecms.entity;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;

@Entity
@Table(name = "eyeglass_coatings")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class EyeglassCoating {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(columnDefinition = "NVARCHAR(150)", nullable = false)
    private String name;

    @Column(columnDefinition = "NVARCHAR(500)")
    private String description;

    @Column(precision = 15, scale = 2, nullable = false)
    private BigDecimal price;
}
