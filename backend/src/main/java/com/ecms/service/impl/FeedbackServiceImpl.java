package com.ecms.service.impl;

import com.ecms.dto.request.FeedbackRequest;
import com.ecms.dto.response.FeedbackResponse;
import com.ecms.entity.Appointment;
import com.ecms.entity.AppointmentStatus;
import com.ecms.entity.Doctor;
import com.ecms.entity.Feedback;
import com.ecms.exception.ResourceNotFoundException;
import com.ecms.repository.AppointmentRepository;
import com.ecms.repository.FeedbackRepository;
import com.ecms.service.FeedbackService;
import com.ecms.service.NotificationService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

/**
 * UC-48: Triển khai gửi đánh giá của bệnh nhân.
 *
 * Quy tắc:
 *  - Chỉ đánh giá được lịch hẹn của chính mình (PRE-3).
 *  - Lịch hẹn phải ở trạng thái COMPLETED (PRE-2).
 *  - Mỗi lịch hẹn chỉ 1 feedback (BR-21).
 *  - Tạo với status = PENDING và gửi thông báo cho Quản lý (POST-2).
 */
@Service
@RequiredArgsConstructor
public class FeedbackServiceImpl implements FeedbackService {

    private final FeedbackRepository feedbackRepository;
    private final AppointmentRepository appointmentRepository;
    private final NotificationService notificationService;

    @Override
    @Transactional
    public FeedbackResponse submitFeedback(Long patientId, FeedbackRequest request) {
        Appointment appointment = appointmentRepository.findById(request.getAppointmentId())
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Lịch hẹn không tồn tại: " + request.getAppointmentId()));

        // PRE-3: chỉ được đánh giá lịch hẹn của chính mình
        if (appointment.getPatient() == null
                || !appointment.getPatient().getId().equals(patientId)) {
            throw new IllegalStateException("Bạn chỉ có thể đánh giá lịch hẹn của chính mình");
        }

        // PRE-2: lịch hẹn phải đã hoàn thành
        if (appointment.getStatus() != AppointmentStatus.COMPLETED) {
            throw new IllegalStateException("Chỉ có thể đánh giá sau khi buổi khám hoàn thành");
        }

        // BR-21: mỗi lịch hẹn chỉ 1 feedback
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

        Feedback saved = feedbackRepository.save(feedback);

        // POST-2: thông báo cho Quản lý phòng khám để duyệt. Lỗi thông báo không chặn luồng chính.
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
    public List<FeedbackResponse> getMyFeedbacks(Long patientId) {
        return feedbackRepository.findByPatient_IdOrderByCreatedAtDesc(patientId)
                .stream().map(this::toResponse).collect(Collectors.toList());
    }

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
