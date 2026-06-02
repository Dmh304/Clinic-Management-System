package com.ecms.entity;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "medical_records")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class MedicalRecord {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "appointment_id", nullable = false)
    private Appointment appointment;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "patient_id", nullable = false)
    private Patient patient;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "doctor_id", nullable = false)
    private Doctor doctor;

    @Column(name = "chief_complaint", columnDefinition = "NVARCHAR(MAX)")
    private String chiefComplaint;

    @Column(name = "symptoms", columnDefinition = "NVARCHAR(MAX)")
    private String symptoms;

    @Column(name = "diagnosis", columnDefinition = "NVARCHAR(MAX)")
    private String diagnosis;

    @Column(name = "treatment_plan", columnDefinition = "NVARCHAR(MAX)")
    private String treatmentPlan;

    @Column(name = "notes", columnDefinition = "NVARCHAR(MAX)")
    private String notes;

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

    @Column(name = "total_amount", precision = 10, scale = 2)
    private BigDecimal totalAmount;

    @Column(name = "locked_at")
    private LocalDateTime lockedAt;

    @Column(name = "locked_by")
    private Long lockedBy;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false)
    private MedicalRecordStatus status;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    private void prePersist() {
        if (status == null) status = MedicalRecordStatus.DRAFT;
        if (createdAt == null) createdAt = LocalDateTime.now();
    }

    @PreUpdate
    private void preUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
