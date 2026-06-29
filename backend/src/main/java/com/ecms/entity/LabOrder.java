/**
 * Author: TuanTD
 * 
 * Đại diện cho một đơn yêu cầu xét nghiệm (Lab Order) trong hệ thống
 * 
 * Quản lý thông tin liên quan đến bệnh án, bác sĩ chỉ định, kỹ thuật viên thực hiện,
 * trạng thái đơn yêu cầu và các mốc thời gian liên quan
 */

package com.ecms.entity;

import java.time.LocalDateTime;

import org.hibernate.annotations.NotFound;
import org.hibernate.annotations.NotFoundAction;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "lab_orders")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class LabOrder {

    /* ID định danh duy nhất của đơn xét nghiệm (Tự động tăng) */
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /* Hồ sơ bệnh án chứa đơn xét nghiệm này */
    @ManyToOne(fetch = FetchType.LAZY)
    @NotFound(action = NotFoundAction.IGNORE)
    @JoinColumn(name = "medical_record_id", nullable = false)
    private MedicalRecord medicalRecord;

    /* Bác sĩ tạo và chỉ định đơn xét nghiệm này */
    @ManyToOne(fetch = FetchType.LAZY)
    @NotFound(action = NotFoundAction.IGNORE)
    @JoinColumn(name = "ordered_by")
    private Doctor doctor;

    /* Kỹ thuật viên phòng xét nghiệm được phân công thực hiện đơn này */
    @ManyToOne(fetch = FetchType.LAZY)
    @NotFound(action = NotFoundAction.IGNORE)
    @JoinColumn(name = "assigned_to")
    private LabTechnician labTechnician;

    /* Ghi chú hoặc yêu cầu đặc biệt từ bác sĩ chỉ định */
    @Column(name = "notes")
    private String notes;

    /* Mức độ ưu tiên của đơn xét nghiệm */
    @Enumerated(EnumType.STRING)
    @Column(name = "priority", nullable = false)
    private LabPriority priority;

    /* Thời gian đơn xét nghiệm được hoàn thành và có kết quả */
    @Column(name = "completed_at")
    private LocalDateTime completedAt;

    /* Trạng thái hiện tại của đơn xét nghiệm */
    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false)
    private LabOrderStatus status;

    /* Lý do bác sĩ từ chối kết quả xét nghiệm */
    @Column(name = "rejection_reason")
    private String rejectionReason;

    /* Thời điểm bác sĩ thực hiện từ chối kết quả xét nghiệm */
    @Column(name = "rejected_at")
    private LocalDateTime rejectedAt;

    /* Thời điểm đơn xét nghiệm được tạo trên hệ thống */
    @Column(name = "created_at")
    private LocalDateTime createdAt;

    /* Thời điểm cập nhật hoặc chỉnh sửa thông tin đơn xét nghiệm gần nhất */
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    /**
     * Tự động thiết lập các giá trị mặc định trước khi lưu mới vào cơ sở dữ liệu
     * Mặc định trạng thái là PENDING và thời gian tạo là thời điểm hiện tại nếu
     * chưa được thiết lập
     */
    @PrePersist
    private void prePersist() {
        if (status == null) {
            status = LabOrderStatus.PENDING;
        }

        if (createdAt == null) {
            createdAt = LocalDateTime.now();
        }
    }

    /*
     * Tự động cập nhật thời điểm chỉnh sửa cuối cùng trước khi cập nhật vào cơ sở
     * dữ liệu
     */
    @PreUpdate
    private void preUpdate() {
        updatedAt = LocalDateTime.now();
    }
}