package com.ecms.entity;

import jakarta.persistence.*;
import lombok.*;

/**
 * UC-48: Điểm đánh giá cho MỘT người tham gia buổi khám (bác sĩ / lễ tân / KTV),
 * gắn với một Feedback tổng thể. Bảng tự tạo bởi Hibernate (ddl-auto=update).
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

    // DOCTOR | RECEPTIONIST | LAB_TECHNICIAN
    @Column(name = "participant_role", nullable = false, length = 30)
    private String participantRole;

    @Column(name = "participant_name")
    private String participantName;

    // 1..5 sao
    @Column(name = "rating", nullable = false)
    private Integer rating;
}
