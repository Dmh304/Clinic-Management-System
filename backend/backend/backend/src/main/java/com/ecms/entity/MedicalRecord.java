package com.ecms.entity;

import java.math.BigDecimal;
import java.time.LocalDateTime;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToOne;
import jakarta.persistence.Table;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;

import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

/**
 * Entity đại diện cho bảng "medical_records" trong cơ sở dữ liệu.
 * Quản lý thông tin chi tiết hồ sơ bệnh án, kết quả khám và thông số thị lực.
 */
@Entity
@Table(name = "medical_records")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class MedicalRecord {

    /** Khóa chính của bảng bệnh án */
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id")
    private Long medicalRecordId;

    /** Mối quan hệ 1-1 với lịch hẹn dựa trên appointment_id */
    @OneToOne
    @JoinColumn(name = "appointment_id", nullable = false)
    private Appointment appointment;

    /** Mối quan hệ Nhiều - Một: Nhiều bệnh án có thể thuộc về cùng một Bệnh nhân */
    @ManyToOne
    @JoinColumn(name = "patient_id", nullable = false)
    private Patient patient;

    /**
     * Mối quan hệ Nhiều - Một: Nhiều bệnh án có thể được lập bởi cùng một Bác sĩ
     */
    @ManyToOne
    @JoinColumn(name = "doctor_id", nullable = false)
    private Doctor doctor;

    /** Lý do đến khám chính */
    @Column(name = "chief_complaint")
    private String chiefComplaint;

    /** Triệu chứng lâm sàng */
    @Column(name = "symptoms")
    private String symptoms;

    /** Chẩn đoán bệnh */
    @Column(name = "diagnosis")
    private String diagnosis;

    /** Phác đồ điều trị */
    @Column(name = "treatment_plan")
    private String treatmentPlan;

    /** Ghi chú bổ sung */
    @Column(name = "notes")
    private String notes;

    /** Thị lực mắt trái không kính (Visual Acuity Left) */
    @Column(name = "va_l", precision = 4, scale = 2)
    private BigDecimal vaL;

    /** Thị lực mắt phải không kính (Visual Acuity Right) */
    @Column(name = "va_r", precision = 4, scale = 2)
    private BigDecimal vaR;

    /** Thị lực mắt trái có kính (Best Corrected Visual Acuity Left) */
    @Column(name = "bcva_l", precision = 4, scale = 2)
    private BigDecimal bcvaL;

    /** Thị lực mắt phải có kính (Best Corrected Visual Acuity Right) */
    @Column(name = "bcva_r", precision = 4, scale = 2)
    private BigDecimal bcvaR;

    /** Độ cầu mắt trái (Spherical Left) */
    @Column(name = "sph_l", precision = 5, scale = 2)
    private BigDecimal sphL;

    /** Độ loạn mắt trái (Cylinder Left) */
    @Column(name = "cyl_l", precision = 5, scale = 2)
    private BigDecimal cylL;

    /** Trục loạn mắt trái (Axis Left) */
    @Column(name = "axis_l")
    private Short axisL; // Kiểu smallint trong SQL ứng với Short trong Java

    /** Nhãn áp mắt trái (Intraocular Pressure Left) */
    @Column(name = "iop_l", precision = 4, scale = 1)
    private BigDecimal iopL;

    /** Độ cầu mắt phải (Spherical Right) */
    @Column(name = "sph_r", precision = 5, scale = 2)
    private BigDecimal sphR;

    /** Độ loạn mắt phải (Cylinder Right) */
    @Column(name = "cyl_r", precision = 5, scale = 2)
    private BigDecimal cylR;

    /** Trục loạn mắt phải (Axis Right) */
    @Column(name = "axis_r")
    private Short axisR;

    /** Nhãn áp mắt phải (Intraocular Pressure Right) */
    @Column(name = "iop_r", precision = 4, scale = 1)
    private BigDecimal iopR;

    /** Tổng chi phí khám/điều trị */
    @Column(name = "total_amount", precision = 10, scale = 2)
    private BigDecimal totalAmount;

    /** Thời điểm bệnh án bị khóa (không cho sửa đổi thông tin lịch sử) */
    @Column(name = "locked_at")
    private LocalDateTime lockedAt;

    /** ID người thực hiện khóa bệnh án */
    @Column(name = "locked_by")
    private Long lockedBy;

    /** Trạng thái bệnh án */
    @Column(name = "status", nullable = false, length = 20)
    private String status;

    /** Thời điểm lập bệnh án */
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    /** Thời điểm cập nhật bệnh án lần cuối */
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = LocalDateTime.now();
    }
}