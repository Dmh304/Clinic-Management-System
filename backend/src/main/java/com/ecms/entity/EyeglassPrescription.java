// DucTKH
// Entity đại diện cho bảng eyeglass_prescriptions trong cơ sở dữ liệu.
// Dùng để lưu trữ thông tin đơn kính (mắt phải, mắt trái, PD, loại tròng).
package com.ecms.entity;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "eyeglass_prescriptions")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class EyeglassPrescription {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "medical_record_id", nullable = false)
    private MedicalRecord medicalRecord;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "doctor_id", nullable = false)
    private Doctor doctor;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "patient_id", nullable = false)
    private Patient patient;

    // Right eye (OD)
    @Column(name = "od_sph", precision = 5, scale = 2)
    private BigDecimal odSph;

    @Column(name = "od_cyl", precision = 5, scale = 2)
    private BigDecimal odCyl;

    @Column(name = "od_axis")
    private Integer odAxis;

    @Column(name = "od_add", precision = 5, scale = 2)
    private BigDecimal odAdd;

    // Left eye (OS)
    @Column(name = "os_sph", precision = 5, scale = 2)
    private BigDecimal osSph;

    @Column(name = "os_cyl", precision = 5, scale = 2)
    private BigDecimal osCyl;

    @Column(name = "os_axis")
    private Integer osAxis;

    @Column(name = "os_add", precision = 5, scale = 2)
    private BigDecimal osAdd;

    // Pupillary Distance
    @Column(name = "pd", precision = 5, scale = 2)
    private BigDecimal pd;

    @Column(name = "lens_type")
    private String lensType; // Single Vision, Progressive, Specialty

    @Column(columnDefinition = "NVARCHAR(500)")
    private String notes;

    @Column(length = 20)
    private String status; // ISSUED

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
        if (status == null) status = "PENDING";
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
