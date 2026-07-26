package com.ecms.service.impl;

import com.ecms.dto.request.FeedbackRequest;
import com.ecms.dto.response.FeedbackResponse;
import com.ecms.entity.Appointment;
import com.ecms.entity.AppointmentStatus;
import com.ecms.entity.Doctor;
import com.ecms.entity.Feedback;
import com.ecms.entity.FeedbackParticipantRating;
import com.ecms.entity.LabOrder;
import com.ecms.entity.MedicalRecord;
import com.ecms.exception.ResourceNotFoundException;
import com.ecms.repository.AppointmentRepository;
import com.ecms.repository.FeedbackRepository;
import com.ecms.repository.LabOrderRepository;
import com.ecms.repository.MedicalRecordRepository;
import com.ecms.repository.UserRepository;
import com.ecms.service.FeedbackService;
import com.ecms.service.NotificationService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * @author  ThangNB - HE201024
 * @created 2026-07-19
 * @updated 2026-07-20
 *
 * Patient feedback logic (UC-48 Submit Feedback).
 *
 * Rules enforced here:
 *  - a patient may only rate their own appointment (UC-48 PRE-3)
 *  - the appointment must be COMPLETED (UC-48 PRE-2)
 *  - BR-21 — one feedback per appointment
 *  - feedback is stored PENDING and the Clinic Manager is notified
 *    (UC-48 POST-1 / POST-2)
 */
@Service
@RequiredArgsConstructor
public class FeedbackServiceImpl implements FeedbackService {

    private final FeedbackRepository feedbackRepository;
    private final AppointmentRepository appointmentRepository;
    private final NotificationService notificationService;
    private final UserRepository userRepository;
    private final MedicalRecordRepository medicalRecordRepository;
    private final LabOrderRepository labOrderRepository;

    @Override
    @Transactional
    /**
     * Stores a patient's feedback for a completed visit
     * (UC-48 normal flow steps 4-5).
     *
     * @param patientId the authenticated patient, resolved by the controller
     * @param request   rating, optional comment, per-participant scores
     * @return the stored feedback (status PENDING)
     * @throws ResourceNotFoundException if the appointment does not exist
     * @throws IllegalStateException     if the visit is not the patient's own,
     *         is not COMPLETED, or has already been rated
     *
     * Validate: UC-48 PRE-3 (ownership), PRE-2 (COMPLETED) and BR-21 (one
     * feedback per appointment), checked in that order before anything is
     * written.
     */
    public FeedbackResponse submitFeedback(Long patientId, FeedbackRequest request) {
        Appointment appointment = appointmentRepository.findById(request.getAppointmentId())
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Lịch hẹn không tồn tại: " + request.getAppointmentId()));

        // UC-48 PRE-3: a patient may only rate their own visit.
        if (appointment.getPatient() == null
                || !appointment.getPatient().getId().equals(patientId)) {
            throw new IllegalStateException("Bạn chỉ có thể đánh giá lịch hẹn của chính mình");
        }

        // UC-48 PRE-2: there is nothing to rate until the visit is COMPLETED.
        if (appointment.getStatus() != AppointmentStatus.COMPLETED) {
            throw new IllegalStateException("Chỉ có thể đánh giá sau khi buổi khám hoàn thành");
        }

        // BR-21 / UC-48 PRE-3: one feedback per appointment — blocks a second
        // submission for the same visit.
        if (feedbackRepository.existsByAppointment_Id(appointment.getId())) {
            throw new IllegalStateException("Lịch hẹn này đã được đánh giá");
        }

        Doctor doctor = appointment.getDoctor();

        Feedback feedback = Feedback.builder()
                .patient(appointment.getPatient())
                .appointment(appointment)
                .doctor(doctor)
                .rating(request.getRating())
                .content(request.getContent())
                .isAnonymous(request.getIsAnonymous() != null ? request.getIsAnonymous() : false)
                .status("PENDING")
                .build();

        // Optional per-participant scores, saved with the parent via cascade.
        // Names are snapshotted so later staff renames do not rewrite history.
        if (request.getParticipantRatings() != null) {
            for (FeedbackRequest.ParticipantRating pr : request.getParticipantRatings()) {
                if (pr.getRating() == null) continue;
                feedback.getParticipantRatings().add(FeedbackParticipantRating.builder()
                        .feedback(feedback)
                        .participantRole(pr.getRole())
                        .participantName(pr.getName())
                        .rating(pr.getRating())
                        .build());
            }
        }

        Feedback saved = feedbackRepository.save(feedback);

        // UC-48 POST-2: notify the Clinic Manager for review. Best-effort — a
        // notification failure must not discard feedback already persisted.
        try {
            String doctorPart = doctor != null ? " (BS. " + doctor.getFullName() + ")" : "";
            notificationService.createForManagers(
                    "Có đánh giá mới " + saved.getRating() + "★" + doctorPart
                            + " cần duyệt.", appointment.getId());
        } catch (Exception ignored) {
        }

        return toResponse(saved);
    }

    @Override
    @Transactional(readOnly = true)
    /**
     * Lists the feedback a patient has submitted.
     *
     * @param patientId the authenticated patient
     * @return their own feedback, scoped by patientId
     */
    public List<FeedbackResponse> getMyFeedbacks(Long patientId) {
        return feedbackRepository.findByPatient_IdOrderByCreatedAtDesc(patientId)
                .stream().map(this::toResponse).collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    /**
     * Describes a visit and everyone who took part, so the feedback form can
     * offer a rating per person.
     *
     * Participants are derived rather than stored: the examining doctor, the
     * receptionist who checked the patient in, and the lab technicians behind
     * the visit's lab orders.
     *
     * @param patientId     the authenticated patient
     * @param appointmentId the visit being rated
     * @return visit summary plus participant list
     * @throws ResourceNotFoundException if the appointment does not exist
     * @throws IllegalStateException     if it is not this patient's visit
     *
     * Validate: ownership is checked before anything is disclosed, otherwise a
     * patient could enumerate other people's visits and treating staff.
     */
    public Map<String, Object> getVisitParticipants(Long patientId, Long appointmentId) {
        Appointment appt = appointmentRepository.findById(appointmentId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Lịch hẹn không tồn tại: " + appointmentId));
        if (appt.getPatient() == null || !appt.getPatient().getId().equals(patientId)) {
            throw new IllegalStateException("Bạn chỉ có thể xem buổi khám của chính mình");
        }

        Map<String, Object> m = new LinkedHashMap<>();
        m.put("appointmentId", appt.getId());
        m.put("appointmentTime", appt.getAppointmentTime());
        m.put("timeSlot", appt.getTimeSlot());
        m.put("serviceName", appt.getClinicService() != null ? appt.getClinicService().getServiceName() : null);
        m.put("status", appt.getStatus() != null ? appt.getStatus().name() : null);
        m.put("alreadyRated", feedbackRepository.existsByAppointment_Id(appointmentId));

        List<Map<String, Object>> participants = new ArrayList<>();

        // The examining doctor
        Doctor d = appt.getDoctor();
        if (d != null) {
            participants.add(person("DOCTOR", "Bác sĩ", d.getFullName(), d.getSpecialization()));
            m.put("doctorName", d.getFullName());
            m.put("doctorSpecialty", d.getSpecialization());
        }
        // The receptionist who checked the patient in (UC-16 check_in_by)
        if (appt.getCheckInBy() != null) {
            userRepository.findById(appt.getCheckInBy()).ifPresent(u ->
                    participants.add(person("RECEPTIONIST", "Lễ tân", u.getFullName(), null)));
        }
        // Lab technicians, reached through the lab orders on the visit's EMR
        Set<String> labNames = new LinkedHashSet<>();
        medicalRecordRepository.findByAppointmentId(appointmentId).ifPresent(mr -> {
            for (LabOrder lo : labOrderRepository.findByMedicalRecordIdOrderByCreatedAt(mr.getId())) {
                if (lo.getLabTechnician() != null && lo.getLabTechnician().getFullName() != null) {
                    labNames.add(lo.getLabTechnician().getFullName());
                }
            }
        });
        for (String name : labNames) {
            participants.add(person("LAB_TECHNICIAN", "KTV xét nghiệm", name, null));
        }

        m.put("participants", participants);
        return m;
    }

    /**
     * Builds one participant entry for the feedback form.
     *
     * @param role      machine role, DOCTOR | RECEPTIONIST | LAB_TECHNICIAN
     * @param roleLabel human-readable role shown to the patient
     * @param name      participant's name
     * @param detail    supporting text, e.g. specialty or test performed
     * @return participant fields keyed by name
     */
    private Map<String, Object> person(String role, String roleLabel, String name, String detail) {
        Map<String, Object> p = new LinkedHashMap<>();
        p.put("role", role);
        p.put("roleLabel", roleLabel);
        p.put("name", name);
        p.put("detail", detail);
        return p;
    }

    /**
     * Maps a {@link Feedback} entity to its DTO.
     *
     * Validate: when {@code isAnonymous} is set the patient name is omitted
     * from the DTO entirely, so an anonymous rating cannot be traced back
     * through the API even by the Clinic Manager's report (UC-53).
     *
     * @param f the feedback entity
     * @return the response DTO
     */
    private FeedbackResponse toResponse(Feedback f) {
        boolean anon = Boolean.TRUE.equals(f.getIsAnonymous());
        return FeedbackResponse.builder()
                .id(f.getId())
                .appointmentId(f.getAppointment() != null ? f.getAppointment().getId() : null)
                .patientId(f.getPatient() != null ? f.getPatient().getId() : null)
                .patientName(anon || f.getPatient() == null ? null : f.getPatient().getFullName())
                .doctorId(f.getDoctor() != null ? f.getDoctor().getId() : null)
                .doctorName(f.getDoctor() != null ? f.getDoctor().getFullName() : null)
                .rating(f.getRating())
                .content(f.getContent())
                .isAnonymous(f.getIsAnonymous())
                .status(f.getStatus())
                .createdAt(f.getCreatedAt())
                .build();
    }
}
