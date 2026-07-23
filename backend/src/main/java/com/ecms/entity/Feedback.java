package com.ecms.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

/**
 * UC-48: Đánh giá của bệnh nhân sau buổi khám (mỗi lịch hẹn tối đa 1 feedback — BR-21).
 * Trạng thái: PENDING (chờ Quản lý duyệt) | APPROVED | HIDDEN.
 */
@Entity
@Table(name = "feedbacks")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Feedback {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "patient_id", nullable = false)
    private Patient patient;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "appointment_id", nullable = false)
    private Appointment appointment;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "doctor_id")
    private Doctor doctor;

    // 1..5 sao (ràng buộc CHECK ở DB)
    @Column(name = "rating", nullable = false)
    private Integer rating;

    @Column(name = "content", columnDefinition = "NVARCHAR(MAX)")
    private String content;

    @Column(name = "is_anonymous", nullable = false)
    private Boolean isAnonymous;

    // PENDING | APPROVED | HIDDEN
    @Column(name = "status", nullable = false, length = 20)
    private String status;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    // UC-48: điểm đánh giá riêng cho từng người tham gia (bác sĩ, lễ tân, KTV)
    @Builder.Default
    @OneToMany(mappedBy = "feedback", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    private List<FeedbackParticipantRating> participantRatings = new ArrayList<>();

    @PrePersist
    protected void onCreate() {
        if (createdAt == null) createdAt = LocalDateTime.now();
        if (status == null) status = "PENDING";
        if (isAnonymous == null) isAnonymous = false;
    }
}
