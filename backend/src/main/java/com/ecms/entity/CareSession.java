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

    @Column(name = "completed_at")
    private LocalDateTime completedAt;

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
    }

    @PreUpdate
    private void preUpdate() {
        this.updatedAt = LocalDateTime.now();
    }
}
