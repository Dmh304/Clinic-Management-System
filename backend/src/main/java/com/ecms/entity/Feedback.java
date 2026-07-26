package com.ecms.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

/**
 * @author      ThangNB - HE201024
 * @contributor Đồng Mạnh Hùng - HE200743
 * @created     2026-07-19
 * @updated     2026-07-20
 *
 * A patient's rating of a completed visit (UC-48 Submit Feedback); the source
 * data behind the Manager's feedback report (UC-53).
 *
 * Moderation status: PENDING (awaiting Manager review) | APPROVED | HIDDEN.
 *
 * Business rules: BR-21 — at most one feedback per appointment.
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

    /** The visit being rated.
     *  Validate: BR-21 — this is the key the one-feedback-per-appointment rule
     *  is checked against before insert. */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "appointment_id", nullable = false)
    private Appointment appointment;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "doctor_id")
    private Doctor doctor;

    /** Overall star rating 1..5.
     *  Validate: bounded by a CHECK constraint at the database level as well
     *  as by bean validation on the request DTO (UC-48 E1). */
    @Column(name = "rating", nullable = false)
    private Integer rating;

    @Column(name = "content", columnDefinition = "NVARCHAR(MAX)")
    private String content;

    @Column(name = "is_anonymous", nullable = false)
    private Boolean isAnonymous;

    /** Moderation state: PENDING | APPROVED | HIDDEN (UC-48 POST-1). */
    @Column(name = "status", nullable = false, length = 20)
    private String status;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    /** Optional per-person ratings for the staff involved in the visit. */
    @Builder.Default
    @OneToMany(mappedBy = "feedback", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    private List<FeedbackParticipantRating> participantRatings = new ArrayList<>();

    /**
     * Fills defaults before INSERT.
     *
     * Validate: UC-48 POST-1 — new feedback always starts PENDING so it
     * reaches the Manager for review rather than appearing published; and
     * anonymity defaults to false, since withholding a name must be an
     * explicit choice by the patient, not an accident of a missing field.
     */
    @PrePersist
    protected void onCreate() {
        if (createdAt == null) createdAt = LocalDateTime.now();
        if (status == null) status = "PENDING";
        if (isAnonymous == null) isAnonymous = false;
    }
}
