package com.ecms.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "care_sessions")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class CareSession {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "subscription_id", nullable = false)
    private PatientServiceSubscription subscription;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "patient_id", nullable = false)
    private Patient patient;

    /** Điều dưỡng được phân công thực hiện buổi khám */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "nurse_id")
    private User nurse;

    /** Phòng chăm sóc — tự resolve từ phân công phòng của điều dưỡng trong ngày (UC-58/UC-59).
     *  Có thể null nếu điều dưỡng chưa được phân công phòng nào cho ngày này. */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "room_id")
    private Room room;

    @Column(name = "scheduled_date_time", nullable = false)
    private LocalDateTime scheduledDateTime;

    /** BOOKED | IN_PROGRESS | COMPLETED | CANCELLED */
    @Column(name = "status", length = 20, nullable = false)
    private String status;

    /** Thứ tự buổi trong gói (buổi 1, 2, 3...) */
    @Column(name = "session_number")
    private Integer sessionNumber;

    /** Ghi chú của bệnh nhân khi đặt */
    @Column(columnDefinition = "NVARCHAR(500)")
    private String notes;

    /** Ghi chú của điều dưỡng sau khi thực hiện */
    @Column(name = "nurse_notes", columnDefinition = "NVARCHAR(1000)")
    private String nurseNotes;

    /** Lễ tân xác nhận khách đã đến quầy trước khi vào hàng đợi điều dưỡng — cùng luồng
     *  check-in đã có ở lịch khám bác sĩ (Appointment.checkInBy/checkInAt). */
    @Column(name = "checked_in", nullable = false)
    private Boolean checkedIn;

    @Column(name = "check_in_at")
    private LocalDateTime checkInAt;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "check_in_by")
    private User checkInBy;

    /** UC-32: mốc bắt đầu thực hiện — cùng completedAt cho phép tính thời lượng buổi khám. */
    @Column(name = "started_at")
    private LocalDateTime startedAt;

    @Column(name = "completed_at")
    private LocalDateTime completedAt;

    /** UC-32 ALT-1: bệnh nhân có phản ứng/sự cố bất thường trong buổi khám — không tự thành
     *  hồ sơ y tế, chỉ để cảnh báo Clinic Manager xem xét. */
    @Column(name = "is_incident")
    private Boolean isIncident;

    @Column(name = "assigned_at")
    private LocalDateTime assignedAt;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    private void prePersist() {
        this.createdAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
        if (this.status == null) this.status = "BOOKED";
        if (this.isIncident == null) this.isIncident = false;
        if (this.checkedIn == null) this.checkedIn = false;
    }

    @PreUpdate
    private void preUpdate() {
        this.updatedAt = LocalDateTime.now();
    }
}
