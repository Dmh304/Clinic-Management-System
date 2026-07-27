package com.ecms.controller;

import com.ecms.dto.request.FeedbackRequest;
import com.ecms.dto.response.ApiResponse;
import com.ecms.dto.response.FeedbackResponse;
import com.ecms.entity.Patient;
import com.ecms.entity.User;
import com.ecms.exception.ResourceNotFoundException;
import com.ecms.repository.PatientRepository;
import com.ecms.repository.UserRepository;
import com.ecms.service.FeedbackService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * @author  ThangNB - HE201024
 * @created 2026-07-19
 * @updated 2026-07-20
 *
 * Patient feedback API (UC-48 Submit Feedback).
 * Base URL: /api/v1/feedbacks
 *
 *   POST /                                          submit feedback for a visit
 *   GET  /appointment/{id}/participants             who took part, for the form
 *   GET  /my                                        the patient's own feedback
 *
 * Validate: every endpoint resolves the patient from the JWT principal via
 * {@link #resolvePatientId}, never from the request, so one patient cannot act
 * on another's visits. BR-21 is enforced in the service.
 */
@RestController
@RequestMapping("/api/v1/feedbacks")
@RequiredArgsConstructor
public class FeedbackController {

    private final FeedbackService feedbackService;
    private final UserRepository userRepository;
    private final PatientRepository patientRepository;

    /**
     * Submits feedback for one of the patient's own completed visits
     * (UC-48 normal flow steps 2-5).
     *
     * @param userDetails authenticated principal
     * @param request     rating, optional comment, per-participant scores
     * @return the stored feedback (status PENDING)
     *
     * Validate: {@code @Valid} applies the mandatory 1..5 rating (UC-48 E1);
     * the service then checks UC-48 PRE-2 (visit COMPLETED) and BR-21
     * (no existing feedback for that appointment).
     */
    @PostMapping
    public ResponseEntity<ApiResponse<FeedbackResponse>> submit(
            @AuthenticationPrincipal UserDetails userDetails,
            @Valid @RequestBody FeedbackRequest request) {
        Long patientId = resolvePatientId(userDetails);
        return ResponseEntity.ok(ApiResponse.success(
                feedbackService.submitFeedback(patientId, request)));
    }

    /**
     * Returns the visit summary and the staff who took part, so the feedback
     * form can offer a rating per person.
     *
     * @param userDetails   authenticated principal
     * @param appointmentId the visit being rated
     * @return visit details plus participant list
     *
     * Validate: the service checks the appointment belongs to this patient.
     */
    @GetMapping("/appointment/{appointmentId}/participants")
    public ResponseEntity<ApiResponse<Map<String, Object>>> participants(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable Long appointmentId) {
        Long patientId = resolvePatientId(userDetails);
        return ResponseEntity.ok(ApiResponse.success(
                feedbackService.getVisitParticipants(patientId, appointmentId)));
    }

    /**
     * Lists the signed-in patient's own submitted feedback.
     *
     * @param userDetails authenticated principal
     * @return that patient's feedback only
     */
    @GetMapping("/my")
    public ResponseEntity<ApiResponse<List<FeedbackResponse>>> myFeedbacks(
            @AuthenticationPrincipal UserDetails userDetails) {
        Long patientId = resolvePatientId(userDetails);
        return ResponseEntity.ok(ApiResponse.success(feedbackService.getMyFeedbacks(patientId)));
    }

    /**
     * Resolves the authenticated principal to their patient profile id.
     *
     * @param userDetails principal injected by Spring Security
     * @return the caller's own patient id
     * @throws ResourceNotFoundException if the account has no patient profile
     *
     * Validate: this is the single choke point that ties every feedback action
     * to the caller's own identity, so no patient id can ever be supplied by
     * the client.
     */
    private Long resolvePatientId(UserDetails userDetails) {
        User user = userRepository.findByEmail(userDetails.getUsername())
                .orElseThrow(() -> new ResourceNotFoundException("Người dùng không tồn tại"));
        Patient patient = patientRepository.findByUserId(user.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy hồ sơ bệnh nhân"));
        return patient.getId();
    }
}
