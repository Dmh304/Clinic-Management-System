package com.ecms.entity;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "lab_results")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class LabResult {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "lab_order_id", nullable = false, unique = true)
    private LabOrder labOrder;

    // Visual acuity – left / right
    @Column(name = "va_l", precision = 4, scale = 2)
    private BigDecimal vaL;

    @Column(name = "va_r", precision = 4, scale = 2)
    private BigDecimal vaR;

    @Column(name = "bcva_l", precision = 4, scale = 2)
    private BigDecimal bcvaL;

    @Column(name = "bcva_r", precision = 4, scale = 2)
    private BigDecimal bcvaR;

    // Left eye optical
    @Column(name = "sph_l", precision = 5, scale = 2)
    private BigDecimal sphL;

    @Column(name = "cyl_l", precision = 5, scale = 2)
    private BigDecimal cylL;

    @Column(name = "axis_l")
    private Integer axisL;

    @Column(name = "iop_l", precision = 4, scale = 1)
    private BigDecimal iopL;

    // Right eye optical
    @Column(name = "sph_r", precision = 5, scale = 2)
    private BigDecimal sphR;

    @Column(name = "cyl_r", precision = 5, scale = 2)
    private BigDecimal cylR;

    @Column(name = "axis_r")
    private Integer axisR;

    @Column(name = "iop_r", precision = 4, scale = 1)
    private BigDecimal iopR;

    @Column(name = "image_url", columnDefinition = "NVARCHAR(500)")
    private String imageUrl;

    @Column(name = "doctor_notes", columnDefinition = "NVARCHAR(MAX)")
    private String doctorNotes;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "uploaded_by", nullable = false)
    private LabTechnician labTechnician;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "reviewed_by", nullable = false)
    private Doctor doctor;

    @Column(name = "reviewed_at")
    private LocalDateTime reviewedAt;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    private void prePersist() {
        if (createdAt == null)
            createdAt = LocalDateTime.now();
    }

    @PreUpdate
    private void preUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
