package com.ecms.dto.request;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.util.List;

/**
 * @author  ThangNB - HE201024
 * @created 2026-07-19
 * @updated 2026-07-20
 *
 * Feedback a patient submits after a completed visit (UC-48 Submit Feedback).
 *
 * Business rules: BR-21 — at most one feedback per appointment, enforced in
 * the service layer.
 */
@Data
public class FeedbackRequest {

    /** Visit being rated.
     *  Validate: required — BR-21 scopes the one-feedback rule to an
     *  appointment, so feedback without one cannot be de-duplicated. */
    @NotNull(message = "Thiếu mã lịch hẹn")
    private Long appointmentId;

    /** Overall star rating.
     *  Validate: UC-48 normal flow step 4 / E1 — a rating is mandatory and
     *  must fall within 1..5; submitting without one is rejected. */
    @NotNull(message = "Vui lòng chọn số sao đánh giá")
    @Min(value = 1, message = "Đánh giá tối thiểu 1 sao")
    @Max(value = 5, message = "Đánh giá tối đa 5 sao")
    private Integer rating;

    /** Free-text comment. Optional per UC-48 normal flow step 3. */
    private String content;

    /** When true the patient's name is withheld from the Manager's report. */
    private Boolean isAnonymous;

    /** Optional per-person ratings for the staff involved in the visit. */
    private List<ParticipantRating> participantRatings;

    /** Rating for one staff member who took part in the visit. */
    @Data
    public static class ParticipantRating {
        /** DOCTOR | RECEPTIONIST | LAB_TECHNICIAN. */
        private String role;
        private String name;
        /** Validate: same 1..5 bound as the overall rating. */
        @Min(1) @Max(5)
        private Integer rating;
    }
}
