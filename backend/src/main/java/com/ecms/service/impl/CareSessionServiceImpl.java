package com.ecms.service.impl;

import com.ecms.dto.request.AssignNurseRequest;
import com.ecms.dto.request.BookCareSessionRequest;
import com.ecms.dto.response.CareSessionResponse;
import com.ecms.dto.response.NurseResponse;
import com.ecms.entity.*;
import com.ecms.exception.ResourceNotFoundException;
import com.ecms.repository.*;
import com.ecms.service.CareSessionService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class CareSessionServiceImpl implements CareSessionService {

    private final CareSessionRepository careSessionRepository;
    private final PatientServiceSubscriptionRepository subscriptionRepository;
    private final PatientRepository patientRepository;
    private final UserRepository userRepository;

    @Override
    @Transactional
    public CareSessionResponse book(BookCareSessionRequest request, String currentUserEmail) {
        PatientServiceSubscription subscription = subscriptionRepository.findById(request.getSubscriptionId())
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy gói đăng ký"));

        Patient currentPatient = patientRepository.findByUser_Email(currentUserEmail)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy hồ sơ bệnh nhân"));

        if (!subscription.getPatient().getId().equals(currentPatient.getId())) {
            throw new IllegalArgumentException("Gói đăng ký không thuộc bệnh nhân này");
        }
        if (!"ACTIVE".equals(subscription.getStatus())) {
            throw new IllegalStateException("Gói đăng ký không còn hiệu lực");
        }
        if (subscription.getExpiryDate() != null && subscription.getExpiryDate().isBefore(LocalDate.now())) {
            subscription.setStatus("EXPIRED");
            subscriptionRepository.save(subscription);
            throw new IllegalStateException("Gói đăng ký đã hết hạn");
        }
        if (subscription.getRemainingSessions() <= 0) {
            throw new IllegalStateException("Gói đăng ký đã hết buổi");
        }

        if (request.getScheduledDateTime().isBefore(LocalDateTime.now())) {
            throw new IllegalArgumentException("Thời gian đặt lịch phải trong tương lai");
        }

        long activeCount = careSessionRepository.countActiveSessionsBySubscription(subscription.getId());
        int sessionNumber = (int) activeCount + 1;

        CareSession session = CareSession.builder()
                .subscription(subscription)
                .patient(currentPatient)
                .scheduledDateTime(request.getScheduledDateTime())
                .sessionNumber(sessionNumber)
                .notes(request.getNotes())
                .build();

        return toResponse(careSessionRepository.save(session));
    }

    @Override
    public List<CareSessionResponse> getMySessions(String currentUserEmail) {
        return careSessionRepository.findByPatient_User_EmailOrderByScheduledDateTimeDesc(currentUserEmail)
                .stream().map(this::toResponse).collect(Collectors.toList());
    }

    @Override
    public List<CareSessionResponse> getAllSessions(LocalDate date) {
        if (date != null) {
            LocalDateTime start = date.atStartOfDay();
            LocalDateTime end = date.plusDays(1).atStartOfDay();
            return careSessionRepository.findByScheduledDateBetween(start, end)
                    .stream().map(this::toResponse).collect(Collectors.toList());
        }
        return careSessionRepository.findAllByOrderByScheduledDateTimeDesc()
                .stream().map(this::toResponse).collect(Collectors.toList());
    }

    @Override
    public List<CareSessionResponse> getNurseQueue(String nurseEmail) {
        User nurse = userRepository.findByEmail(nurseEmail)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy người dùng"));
        return careSessionRepository.findByNurse_IdAndStatusOrderByScheduledDateTimeAsc(nurse.getId(), "BOOKED")
                .stream().map(this::toResponse).collect(Collectors.toList());
    }

    @Override
    public List<CareSessionResponse> getSessionsBySubscription(Long subscriptionId) {
        return careSessionRepository.findBySubscription_IdOrderBySessionNumberAsc(subscriptionId)
                .stream().map(this::toResponse).collect(Collectors.toList());
    }

    @Override
    @Transactional
    public CareSessionResponse assignNurse(Long id, AssignNurseRequest request) {
        CareSession session = getSessionOrThrow(id);
        if (!"BOOKED".equals(session.getStatus())) {
            throw new IllegalStateException("Chỉ có thể phân công điều dưỡng cho buổi chưa bắt đầu");
        }
        User nurse = userRepository.findById(request.getNurseId())
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy điều dưỡng"));
        if (!"NURSE".equals(nurse.getRole().getName())) {
            throw new IllegalArgumentException("Người dùng được chọn không phải điều dưỡng");
        }
        session.setNurse(nurse);
        session.setAssignedAt(LocalDateTime.now());
        return toResponse(careSessionRepository.save(session));
    }

    @Override
    @Transactional
    public CareSessionResponse startSession(Long id, String nurseEmail) {
        CareSession session = getSessionOrThrow(id);
        User nurse = userRepository.findByEmail(nurseEmail)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy người dùng"));

        if (!"BOOKED".equals(session.getStatus())) {
            throw new IllegalStateException("Buổi khám không ở trạng thái có thể bắt đầu");
        }
        if (session.getNurse() == null || !session.getNurse().getId().equals(nurse.getId())) {
            throw new IllegalArgumentException("Bạn không được phân công buổi khám này");
        }
        session.setStatus("IN_PROGRESS");
        return toResponse(careSessionRepository.save(session));
    }

    @Override
    @Transactional
    public CareSessionResponse completeSession(Long id, String nurseNotes, String nurseEmail) {
        CareSession session = getSessionOrThrow(id);
        User nurse = userRepository.findByEmail(nurseEmail)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy người dùng"));

        if (!"IN_PROGRESS".equals(session.getStatus())) {
            throw new IllegalStateException("Buổi khám chưa được bắt đầu");
        }
        if (session.getNurse() == null || !session.getNurse().getId().equals(nurse.getId())) {
            throw new IllegalArgumentException("Bạn không được phân công buổi khám này");
        }
        session.setStatus("COMPLETED");
        session.setNurseNotes(nurseNotes);
        session.setCompletedAt(LocalDateTime.now());
        return toResponse(careSessionRepository.save(session));
    }

    @Override
    @Transactional
    public CareSessionResponse checkoutSession(Long id, String receptionistEmail) {
        CareSession session = getSessionOrThrow(id);

        if (!"COMPLETED".equals(session.getStatus())) {
            throw new IllegalStateException("Buổi khám chưa hoàn thành");
        }

        PatientServiceSubscription subscription = session.getSubscription();
        subscription.setUsedSessions(subscription.getUsedSessions() + 1);

        if (subscription.getUsedSessions() >= subscription.getTotalSessions()) {
            subscription.setStatus("DEPLETED");
        }
        subscriptionRepository.save(subscription);

        session.setStatus("CHECKED_OUT");
        return toResponse(careSessionRepository.save(session));
    }

    @Override
    @Transactional
    public CareSessionResponse cancelSession(Long id, String currentUserEmail) {
        CareSession session = getSessionOrThrow(id);

        if ("COMPLETED".equals(session.getStatus()) || "CHECKED_OUT".equals(session.getStatus())) {
            throw new IllegalStateException("Không thể huỷ buổi đã hoàn thành");
        }
        session.setStatus("CANCELLED");
        return toResponse(careSessionRepository.save(session));
    }

    @Override
    public List<NurseResponse> getAllNurses() {
        return userRepository.findByRole_Name("NURSE")
                .stream()
                .map(u -> NurseResponse.builder()
                        .id(u.getId())
                        .fullName(u.getFullName())
                        .email(u.getEmail())
                        .phone(u.getPhone())
                        .build())
                .collect(Collectors.toList());
    }

    private CareSession getSessionOrThrow(Long id) {
        return careSessionRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy buổi khám với ID: " + id));
    }

    private CareSessionResponse toResponse(CareSession s) {
        PatientServiceSubscription sub = s.getSubscription();
        return CareSessionResponse.builder()
                .id(s.getId())
                .subscriptionId(sub.getId())
                .serviceName(sub.getService().getServiceName())
                .patientId(s.getPatient().getId())
                .patientName(s.getPatient().getFullName())
                .patientCode(s.getPatient().getPatientCode())
                .nurseId(s.getNurse() != null ? s.getNurse().getId() : null)
                .nurseName(s.getNurse() != null ? s.getNurse().getFullName() : null)
                .scheduledDateTime(s.getScheduledDateTime())
                .status(s.getStatus())
                .sessionNumber(s.getSessionNumber())
                .totalSessions(sub.getTotalSessions())
                .remainingSessions(sub.getRemainingSessions())
                .notes(s.getNotes())
                .nurseNotes(s.getNurseNotes())
                .completedAt(s.getCompletedAt())
                .assignedAt(s.getAssignedAt())
                .createdAt(s.getCreatedAt())
                .build();
    }
}
