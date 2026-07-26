package com.ecms.dto.response;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

/**
 * @author  ThangNB - HE201024
 * @created 2026-07-19
 * @updated 2026-07-19
 *
 * Feedback projection returned to the patient portal (UC-48) and to the
 * Clinic Manager's feedback report (UC-53).
 */
@Data
@Builder
public class FeedbackResponse {
    private Long id;
    private Long appointmentId;
    private Long patientId;
    /** Null when the patient submitted anonymously — withheld rather than
     *  merely hidden client-side, so the name never leaves the server. */
    private String patientName;
    private Long doctorId;
    private String doctorName;
    private Integer rating;
    private String content;
    private Boolean isAnonymous;
    /** Moderation state; new feedback starts PENDING (UC-48 POST-1). */
    private String status;
    private LocalDateTime createdAt;
}
