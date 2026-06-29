
/**
 * Author: TuanTD
 * 
 * Thực thể (Entity) đại diện cho Bảng hồ sơ bệnh án (medical_records) trong cơ sở dữ liệu
 * Sử dụng chủ yếu cho chuyên khoa Mắt với các chỉ số thị lực, khúc xạ và nhãn áp
 */

package com.ecms.entity;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "medical_records")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MedicalRecord {

    /* ID tự tăng - Khóa chính của hồ sơ bệnh án */
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /**
     * Mối quan hệ Nhiều-Một với bảng Lịch hẹn (appointments)
     * Một lịch hẹn chỉ tương ứng với một hồ sơ bệnh án tại thời điểm đó
     * Sử dụng FetchType.LAZY để tối ưu hiệu năng (chỉ tải dữ liệu khi cần)
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "appointment_id", nullable = false)
    private Appointment appointment;

    /**
     * Mối quan hệ Nhiều-Một với bảng Bệnh nhân (patients)
     * Xác định hồ sơ này thuộc về bệnh nhân nào
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "patient_id", nullable = false)
    private Patient patient;

    /**
     * Mối quan hệ Nhiều-Một với bảng Bác sĩ (doctors)
     * Xác định bác sĩ nào phụ trách khám và lập hồ sơ này
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "doctor_id", nullable = false)
    private Doctor doctor;

    /**
     * Lý do đến khám (Chief Complaint)
     * Kiểu NVARCHAR(MAX) hỗ trợ lưu văn bản dài và có dấu tiếng Việt
     */
    @Column(name = "chief_complaint", columnDefinition = "NVARCHAR(MAX)")
    private String chiefComplaint;

    /* Triệu chứng lâm sàng của bệnh nhân */
    @Column(name = "symptoms", columnDefinition = "NVARCHAR(MAX)")
    private String symptoms;

    /* Chẩn đoán bệnh của bác sĩ */
    @Column(name = "diagnosis", columnDefinition = "NVARCHAR(MAX)")
    private String diagnosis;

    /* Phác đồ / Kế hoạch điều trị */
    @Column(name = "treatment_plan", columnDefinition = "NVARCHAR(MAX)")
    private String treatmentPlan;

    /* Ghi chú bổ sung của bác sĩ */
    @Column(name = "notes", columnDefinition = "NVARCHAR(MAX)")
    private String notes;

    // ==========================================
    // THÔNG SỐ THỊ LỰC (VISUAL ACUITY - VA)
    // ==========================================

    /* Thị lực không kính Mắt Trái (Visual Acuity - Left) */
    @Column(name = "va_l", precision = 4, scale = 2)
    private BigDecimal vaL;

    /* Thị lực không kính Mắt Phải (Visual Acuity - Right) */
    @Column(name = "va_r", precision = 4, scale = 2)
    private BigDecimal vaR;

    /* Thị lực có kính tối ưu Mắt Trái (Best Corrected Visual Acuity - Left) */
    @Column(name = "bcva_l", precision = 4, scale = 2)
    private BigDecimal bcvaL;

    /* Thị lực có kính tối ưu Mắt Phải (Best Corrected Visual Acuity - Right) */
    @Column(name = "bcva_r", precision = 4, scale = 2)
    private BigDecimal bcvaR;

    // ==========================================
    // THÔNG SỐ KHÚC XẠ & NHÃN ÁP MẮT TRÁI (LEFT EYE)
    // ==========================================

    /* Độ cầu Mắt Trái (Sphere - L): Cận thị (-) hoặc Viễn thị (+) */
    @Column(name = "sph_l", precision = 5, scale = 2)
    private BigDecimal sphL;

    /* Độ loạn Mắt Trái (Cylinder - L) */
    @Column(name = "cyl_l", precision = 5, scale = 2)
    private BigDecimal cylL;

    /* Trục loạn thị Mắt Trái (Axis - L): Từ 0 đến 180 độ */
    @Column(name = "axis_l")
    private Integer axisL;

    /*
     * Nhãn áp Mắt Trái (Intraocular Pressure - L): Đo áp lực trong mắt (đơn vị
     * mmHg)
     */
    @Column(name = "iop_l", precision = 4, scale = 1)
    private BigDecimal iopL;

    // ==========================================
    // THÔNG SỐ KHÚC XẠ & NHÃN ÁP MẮT PHẢI (RIGHT EYE)
    // ==========================================

    /* Độ cầu Mắt Phải (Sphere - R): Cận thị (-) hoặc Viễn thị (+) */
    @Column(name = "sph_r", precision = 5, scale = 2)
    private BigDecimal sphR;

    /* Độ loạn Mắt Phải (Cylinder - R) */
    @Column(name = "cyl_r", precision = 5, scale = 2)
    private BigDecimal cylR;

    /* Trục loạn thị Mắt Phải (Axis - R): Từ 0 đến 180 độ */
    @Column(name = "axis_r")
    private Integer axisR;

    /*
     * Nhãn áp Mắt Phải (Intraocular Pressure - R): Đo áp lực trong mắt (đơn vị
     * mmHg)
     */
    @Column(name = "iop_r", precision = 4, scale = 1)
    private BigDecimal iopR;

    // ==========================================
    // THÔNG TIN QUẢN LÝ & TRẠNG THÁI HỒ SƠ
    // ==========================================

    /*
     * Đường dẫn (URL) ảnh kết quả xét nghiệm / chụp chiếu (X-Quang, CT, Siêu âm
     * mắt...)
     */
    @Column(name = "lab_image_url", columnDefinition = "TEXT")
    private String labImageUrl;

    /* Tổng chi phí khám/điều trị của hồ sơ bệnh án này */
    @Column(name = "total_amount", precision = 10, scale = 2)
    private BigDecimal totalAmount;

    /*
     * Thời điểm khóa hồ sơ bệnh án (Không cho phép chỉnh sửa sau khi đã hoàn thành)
     */
    @Column(name = "locked_at")
    private LocalDateTime lockedAt;

    /* ID của người thực hiện khóa hồ sơ bệnh án này */
    @Column(name = "locked_by")
    private Long lockedBy;

    /* Trạng thái của hồ sơ bệnh án */
    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false)
    private MedicalRecordStatus status;

    /* Thời gian tạo hồ sơ bệnh án */
    @Column(name = "created_at")
    private LocalDateTime createdAt;

    /* Thời gian cập nhật hồ sơ bệnh án gần nhất */
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    // ==========================================
    // CALLBACK METHODS (JPA LIFECYCLE)
    // ==========================================

    /**
     * Hàm tự động chạy TRƯỚC KHI bản ghi được thêm mới (Insert) vào DB
     * Thiết lập trạng thái mặc định là DRAFT và gán thời gian tạo hiện tại
     */
    @PrePersist
    private void prePersist() {
        if (status == null)
            status = MedicalRecordStatus.DRAFT;
        if (createdAt == null)
            createdAt = LocalDateTime.now();
    }

    /**
     * Hàm tự động chạy TRƯỚC KHI bản ghi được cập nhật (Update) vào DB
     * Tự động cập nhật mốc thời gian chỉnh sửa mới nhất
     */
    @PreUpdate
    private void preUpdate() {
        updatedAt = LocalDateTime.now();
    }
}