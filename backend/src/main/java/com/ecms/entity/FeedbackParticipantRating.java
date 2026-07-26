package com.ecms.entity;

import jakarta.persistence.*;
import lombok.*;

/**
 * @author  ThangNB - HE201024
 * @created 2026-07-20
 * @updated 2026-07-20
 *
 * Rating for a single participant in a visit — doctor, receptionist or lab
 * technician — hanging off the overall {@link Feedback} (UC-48).
 * Table created by Hibernate under ddl-auto=update.
 */
@Entity
@Table(name = "feedback_participant_ratings")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class FeedbackParticipantRating {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "feedback_id", nullable = false)
    private Feedback feedback;

    /** DOCTOR | RECEPTIONIST | LAB_TECHNICIAN. */
    @Column(name = "participant_role", nullable = false, length = 30)
    private String participantRole;

    /** Name captured at submission time, so a later staff rename does not
     *  rewrite historical feedback. */
    @Column(name = "participant_name")
    private String participantName;

    /** Star rating 1..5. Validate: bounds are enforced on the request DTO
     *  before this row is built. */
    @Column(name = "rating", nullable = false)
    private Integer rating;
}
