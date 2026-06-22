package com.ecms.entity;

import java.time.LocalDate;
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

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /**
     * Bệnh nhân của lịch hẹn.
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @NotFound(action = NotFoundAction.IGNORE)
    @JoinColumn(name = "medical_record_id", nullable = false)
    private MedicalRecord medicalRecord;

    /**
     * Bác sĩ phụ trách lịch hẹn.
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @NotFound(action = NotFoundAction.IGNORE)
    @JoinColumn(name = "ordered_by")
    private Doctor doctor;

    /**
     * Dịch vụ khám được chọn.
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @NotFound(action = NotFoundAction.IGNORE)
    @JoinColumn(name = "assigned_to")
    private LabTechnician labTechnician;

    /**
     * Khung giờ khám hiển thị trên giao diện.
     */
    @Column(name = "notes")
    private String notes;

    @Enumerated(EnumType.STRING)
    @Column(name = "priority", nullable = false)
    private LabPriority priority;

    /**
     * Thời gian khám.
     */
    @Column(name = "completed_at")
    private LocalDateTime completedAt;

    /**
     * Trạng thái lịch hẹn.
     */
    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false)
    private LabOrderStatus status;

    @Column(name = "rejection_reason")
    private String rejectionReason;

    @Column(name = "rejected_at")
    private LocalDateTime rejectedAt;

    /**
     * Thời điểm tạo lịch hẹn.
     */
    @Column(name = "created_at")
    private LocalDateTime createdAt;

    /**
     * Thời điểm cập nhật lịch hẹn gần nhất.
     */
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    /**
     * Thiết lập giá trị mặc định trước khi tạo mới.
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

    /**
     * Cập nhật thời điểm chỉnh sửa cuối.
     */
    @PreUpdate
    private void preUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
