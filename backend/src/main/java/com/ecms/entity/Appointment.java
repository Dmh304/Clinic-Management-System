package com.ecms.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.NotFound;
import org.hibernate.annotations.NotFoundAction;

import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * Entity đại diện cho lịch hẹn khám bệnh trong hệ thống.
 *
 * Hỗ trợ các nghiệp vụ: tạo lịch hẹn online hoặc vãng lai,
 * xác nhận lịch hẹn, check-in bệnh nhân, quản lý hàng đợi
 * và theo dõi trạng thái lịch hẹn.
 *
 * DucTKH
 */
@Entity
@Table(name = "appointments")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Appointment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /**
     * Bệnh nhân của lịch hẹn.
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @NotFound(action = NotFoundAction.IGNORE)
    @JoinColumn(name = "patient_id", nullable = false)
    private Patient patient;

     /**
     * Bác sĩ phụ trách lịch hẹn.
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @NotFound(action = NotFoundAction.IGNORE)
    @JoinColumn(name = "doctor_id")
    private Doctor doctor;

    /**
     * Dịch vụ khám được chọn.
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @NotFound(action = NotFoundAction.IGNORE)
    @JoinColumn(name = "service_id")
    private ClinicService clinicService;

    /**
     * Thời gian khám.
     */
    @Column(name = "appointment_time", nullable = false)
    private LocalDateTime appointmentTime;

    /**
     * Khung giờ khám hiển thị trên giao diện.
     */
    @Column(name = "time_slot")
    private String timeSlot;

     /**
     * Trạng thái lịch hẹn.
     */
    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false)
    private AppointmentStatus status;

    /**
     * Loại lịch hẹn: ONLINE hoặc WALK_IN.
     */
    @Column(name = "type")
    private String type;

    /**
     * Ghi chú của lịch hẹn.
     */
    @Column(name = "notes")
    private String notes;

    /**
     * Số thứ tự trong hàng đợi khám.
     */
    @Column(name = "queue_number")
    private Integer queueNumber;

    /**
     * Thời điểm bệnh nhân check-in.
     */
    @Column(name = "check_in_time")
    private LocalDateTime checkInTime;

     /**
     * ID nhân viên thực hiện check-in.
     */
    @Column(name = "check_in_by")
    private Long checkInBy;

     /**
     * Trạng thái gửi nhắc lịch.
     */
    @Column(name = "reminder_sent")
    private Boolean reminderSent;

     /**
     * Lý do hủy lịch hẹn.
     */
    @Column(name = "cancel_reason")
    private String cancelReason;

    /**
     * ID người hủy lịch hẹn.
     */
    @Column(name = "cancelled_by")
    private Long cancelledBy;

    /**
     * Thời điểm hủy lịch hẹn.
     */
    @Column(name = "cancelled_at")
    private LocalDateTime cancelledAt;

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
     * Lấy ngày khám từ thời gian khám.
     */
    public LocalDate getAppointmentDate() {
        return appointmentTime != null ? appointmentTime.toLocalDate() : null;
    }

    /**
     * Thiết lập giá trị mặc định trước khi tạo mới.
     */
    @PrePersist
    private void prePersist() {
        if (status == null) {
            status = AppointmentStatus.PENDING;
        }

        if (reminderSent == null) {
            reminderSent = false;
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