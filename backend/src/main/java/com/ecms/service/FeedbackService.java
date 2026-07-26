package com.ecms.service;

import com.ecms.dto.request.FeedbackRequest;
import com.ecms.dto.response.FeedbackResponse;

import java.util.List;
import java.util.Map;

/**
 * @author  ThangNB - HE201024
 * @created 2026-07-19
 * @updated 2026-07-20
 *
 * Patient feedback contract for UC-48 (Submit Feedback); the stored records
 * feed the Clinic Manager's report in UC-53.
 *
 * Business rules: BR-21 — one feedback per appointment.
 */
public interface FeedbackService {

    /**
     * Records a patient's feedback for one of their own visits
     * (UC-48 normal flow steps 2-5).
     *
     * @param patientId the authenticated patient, resolved from their account
     * @param request   rating, optional comment and per-participant scores
     * @return the stored feedback with status PENDING
     *
     * Validate: UC-48 PRE-2 (the appointment must be COMPLETED), PRE-3 /
     * BR-21 (no feedback may already exist for it) and ownership — a patient
     * can only rate their own visit.
     */
    FeedbackResponse submitFeedback(Long patientId, FeedbackRequest request);

    /**
     * Lists the feedback a patient has already submitted.
     *
     * @param patientId the authenticated patient
     * @return their own feedback only
     */
    List<FeedbackResponse> getMyFeedbacks(Long patientId);

    /**
     * Describes a visit and everyone who took part in it — doctor,
     * receptionist, lab technician — so the feedback form can offer a rating
     * per person.
     *
     * @param patientId     the authenticated patient
     * @param appointmentId the visit being rated
     * @return visit summary plus the participant list
     *
     * Validate: ownership — the appointment must belong to {@code patientId},
     * otherwise a patient could enumerate other people's visits.
     */
    Map<String, Object> getVisitParticipants(Long patientId, Long appointmentId);
}
