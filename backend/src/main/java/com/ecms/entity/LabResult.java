/**
 * Author: TuanTD
 * 
 * Thực thể (Entity) đại diện cho Bảng kết quả xét nghiệm/đo đạc lâm sàng (lab_results) trong cơ sở dữ liệu
 * Lưu trữ chi tiết các chỉ số khúc xạ, thị lực và nhãn áp được thực hiện bởi kỹ thuật viên viên
 * * Ràng buộc: Mỗi lệnh xét nghiệm (LabOrder) chỉ có duy nhất một kết quả (UniqueConstraint)
 */

package com.ecms.entity;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "lab_results", uniqueConstraints = @UniqueConstraint(columnNames = "lab_order_id"))
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class LabResult {

    /* ID tự tăng - Khóa chính của bảng kết quả xét nghiệm */
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /**
     * Mối quan hệ Nhiều-Một liên kết tới lệnh xét nghiệm (LabOrder)
     * Do cấu hình `unique = true`, quan hệ này trên thực tế hoạt động như một quan
     * hệ Một-Một (One-to-One)
     * Sử dụng FetchType.LAZY để tối ưu hiệu năng khi truy vấn
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "lab_order_id", nullable = false, unique = true)
    private LabOrder labOrder;

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

    /* Độ cầu Mắt Trái (Sphere - L): Đại diện cho Cận thị (-) hoặc Viễn thị (+) */
    @Column(name = "sph_l", precision = 5, scale = 2)
    private BigDecimal sphL;

    /* Độ loạn Mắt Trái (Cylinder - L) */
    @Column(name = "cyl_l", precision = 5, scale = 2)
    private BigDecimal cylL;

    /* Trục loạn thị Mắt Trái (Axis - L): Giá trị từ 0 đến 180 độ */
    @Column(name = "axis_l")
    private Integer axisL;

    /*
     * Nhãn áp Mắt Trái (Intraocular Pressure - L): Áp lực bên trong nhãn cầu (đơn
     * vị: mmHg)
     */
    @Column(name = "iop_l", precision = 4, scale = 1)
    private BigDecimal iopL;

    // ==========================================
    // THÔNG SỐ KHÚC XẠ & NHÃN ÁP MẮT PHẢI (RIGHT EYE)
    // ==========================================

    /* Độ cầu Mắt Phải (Sphere - R): Đại diện cho Cận thị (-) hoặc Viễn thị (+) */
    @Column(name = "sph_r", precision = 5, scale = 2)
    private BigDecimal sphR;

    /* Độ loạn Mắt Phải (Cylinder - R) */
    @Column(name = "cyl_r", precision = 5, scale = 2)
    private BigDecimal cylR;

    /* Trục loạn thị Mắt Phải (Axis - R): Giá trị từ 0 đến 180 độ */
    @Column(name = "axis_r")
    private Integer axisR;

    /*
     * Nhãn áp Mắt Phải (Intraocular Pressure - R): Áp lực bên trong nhãn cầu (đơn
     * vị: mmHg)
     */
    @Column(name = "iop_r", precision = 4, scale = 1)
    private BigDecimal iopR;

    /**
     * Đường dẫn (URL) lưu ảnh kết quả đo đạc
     * Kiểu TEXT để hỗ trợ lưu chuỗi URL dài hoặc danh sách URL phân tách nhau
     */
    @Column(name = "image_url", columnDefinition = "TEXT")
    private String imageUrls;

    /**
     * Ghi chú/Nhận xét của bác sĩ sau khi xem kết quả đo này
     * Sử dụng NVARCHAR(MAX) hỗ trợ tiếng Việt có dấu với độ dài lớn
     */
    @Column(name = "doctor_notes", columnDefinition = "NVARCHAR(MAX)")
    private String doctorNotes;

    /*
     * Kỹ thuật viên (LabTechnician) thực hiện đo đạc và upload kết quả này lên hệ
     * thống
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "uploaded_by", nullable = false)
    private LabTechnician labTechnician;

    /* Bác sĩ (Doctor) phụ trách xem xét, đánh giá và duyệt kết quả này */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "reviewed_by", nullable = false)
    private Doctor doctor;

    /* Thời điểm bác sĩ thực hiện duyệt/xem xét kết quả */
    @Column(name = "reviewed_at")
    private LocalDateTime reviewedAt;

    /* Thời gian kết quả này được tạo ra */
    @Column(name = "created_at")
    private LocalDateTime createdAt;

    /* Thời gian cập nhật kết quả gần nhất */
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    // ==========================================
    // CALLBACK METHODS (JPA LIFECYCLE)
    // ==========================================

    /**
     * Hàm tự động chạy TRƯỚC KHI bản ghi được thêm mới (Insert) vào Database
     * Tự động gán thời gian tạo nếu chưa được thiết lập
     */
    @PrePersist
    private void prePersist() {
        if (createdAt == null)
            createdAt = LocalDateTime.now();
    }

    /**
     * Hàm tự động chạy TRƯỚC KHI bản ghi được cập nhật (Update) vào Database
     * Tự động cập nhật mốc thời gian chỉnh sửa mới nhất
     */
    @PreUpdate
    private void preUpdate() {
        updatedAt = LocalDateTime.now();
    }
}