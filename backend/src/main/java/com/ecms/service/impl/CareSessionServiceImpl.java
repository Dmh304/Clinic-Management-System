package com.ecms.service.impl;

import com.ecms.dto.request.AssignNurseRequest;
import com.ecms.dto.request.BookCareSessionRequest;
import com.ecms.dto.response.AutoAssignResult;
import com.ecms.dto.response.CareSessionResponse;
import com.ecms.dto.response.NurseResponse;
import com.ecms.dto.response.RoomResolutionResponse;
import com.ecms.entity.*;
import com.ecms.exception.ResourceNotFoundException;
import com.ecms.repository.*;
import com.ecms.service.AuditLogService;
import com.ecms.service.CareSessionService;
import com.ecms.service.NotificationService;
import com.ecms.service.StaffRoomAssignmentService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
// readOnly mặc định cho cả class để giữ session mở khi map entity (open-in-view=false),
// tránh LazyInitializationException ở getMySessions/getNurseQueue/getAllSessions...
// Các method ghi (book, assignNurse, start, complete, checkout, cancel) đã có
// @Transactional riêng nên tự ghi đè thành read-write.
@Transactional(readOnly = true)
public class CareSessionServiceImpl implements CareSessionService {

    /** BR-16: số buổi chăm sóc tối đa mỗi điều dưỡng trong một ngày (mirror BR-03 của bác sĩ). */
    private static final int MAX_CARE_SESSIONS_PER_NURSE_PER_DAY = 12;

    /** Thời lượng mặc định dùng để tính trùng khung giờ khi gói dịch vụ không khai báo
     *  thời lượng (durationMinutes null trên ClinicService). */
    private static final int DEFAULT_SESSION_DURATION_MINUTES = 30;

    /** Giờ làm việc của phòng khám — buổi dịch vụ phải nằm trong khung này, khớp với
     *  giờ khám chính (mở 07:30, đóng 17:00). Đồng bộ với hằng số phía frontend
     *  (constants/clinicInfo.js) và lưới slot của lịch khám vãng lai. */
    private static final LocalTime CLINIC_OPEN_TIME = LocalTime.of(7, 30);
    private static final LocalTime CLINIC_CLOSE_TIME = LocalTime.of(17, 0);

    private final CareSessionRepository careSessionRepository;
    private final PatientServiceSubscriptionRepository subscriptionRepository;
    private final PatientRepository patientRepository;
    private final UserRepository userRepository;
    private final NotificationService notificationService;
    private final AuditLogService auditLogService;
    private final StaffRoomAssignmentService staffRoomAssignmentService;
    private final RoomRepository roomRepository;
    // UC-21: xác định subscription đã được thu tiền (có hóa đơn chưa hủy) hay chưa,
    // để CheckoutCareSessionPage biết buổi này có cần redirect sang thanh toán không.
    private final InvoiceRepository invoiceRepository;

    /** UC-58/UC-59: phòng của điều dưỡng cho 1 ngày chăm sóc — best-effort, không chặn phân
     *  công nếu điều dưỡng chưa được phân công phòng nào (trả về null). */
    private Room resolveRoomForNurse(User nurse, LocalDate date) {
        try {
            if (nurse == null || date == null) return null;
            RoomResolutionResponse resolved = staffRoomAssignmentService.resolveRoomForUser(nurse.getId(), date);
            return resolved != null && resolved.isResolved()
                    ? roomRepository.findById(resolved.getRoomId()).orElse(null)
                    : null;
        } catch (Exception e) {
            log.warn("UC-59: Không resolve được phòng cho điều dưỡng {} ngày {}: {}",
                    nurse.getId(), date, e.getMessage());
            return null;
        }
    }

    /** Mở rộng UC-20: tự động chọn điều dưỡng đang rảnh đúng khung giờ để gán ngay lúc đặt
     *  lịch, thay vì luôn để trống chờ Manager phân công tay. Chỉ xét điều dưỡng đã được
     *  phân công phòng cho đúng ngày đó (StaffRoomAssignmentService — tín hiệu gần nhất hệ thống đang
     *  có cho "đang trực hôm đó"), chưa đủ trần BR-16 (12 buổi/ngày) và không trùng khung giờ
     *  với buổi đã có (so theo [giờ đặt, giờ đặt + thời lượng dịch vụ)). Không tìm được ai phù
     *  hợp thì trả về null — buổi vẫn được tạo bình thường, Manager xử lý tay như trước (không
     *  chặn bệnh nhân đặt lịch vì lý do nhân sự). */
    private User pickAvailableNurse(LocalDateTime scheduledDateTime, Integer serviceDurationMinutes) {
        LocalDate date = scheduledDateTime.toLocalDate();
        LocalDateTime dayStart = date.atStartOfDay();
        LocalDateTime dayEnd = date.plusDays(1).atStartOfDay();
        int duration = serviceDurationMinutes != null ? serviceDurationMinutes : DEFAULT_SESSION_DURATION_MINUTES;
        LocalDateTime newEnd = scheduledDateTime.plusMinutes(duration);

        User best = null;
        long bestLoad = Long.MAX_VALUE;
        for (User nurse : userRepository.findByRole_Name("NURSE")) {
            // Chưa được phân công phòng cho ngày này -> coi như không trực, bỏ qua.
            if (resolveRoomForNurse(nurse, date) == null) continue;

            List<CareSession> daySessions = careSessionRepository
                    .findByNurse_IdAndScheduledDateTimeBetweenOrderByScheduledDateTimeAsc(nurse.getId(), dayStart, dayEnd)
                    .stream()
                    .filter(s -> !"CANCELLED".equals(s.getStatus()))
                    .collect(Collectors.toList());

            if (daySessions.size() >= MAX_CARE_SESSIONS_PER_NURSE_PER_DAY) continue;

            boolean overlap = daySessions.stream().anyMatch(s -> {
                Integer existDuration = s.getSubscription() != null && s.getSubscription().getService() != null
                        ? s.getSubscription().getService().getDurationMinutes() : null;
                LocalDateTime existEnd = s.getScheduledDateTime()
                        .plusMinutes(existDuration != null ? existDuration : DEFAULT_SESSION_DURATION_MINUTES);
                return scheduledDateTime.isBefore(existEnd) && s.getScheduledDateTime().isBefore(newEnd);
            });
            if (overlap) continue;

            if (daySessions.size() < bestLoad) {
                bestLoad = daySessions.size();
                best = nurse;
            }
        }
        return best;
    }

    @Override
    @Transactional
    public CareSessionResponse book(BookCareSessionRequest request, String currentUserEmail) {
        PatientServiceSubscription subscription = subscriptionRepository.findById(request.getSubscriptionId())
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy gói đăng ký"));

        // UC-40 ALT-1: xác định người đặt — patient tự đặt hay Receptionist đặt hộ.
        // Receptionist không có hồ sơ bệnh nhân → findByUser_Email trả empty.
        Patient currentPatient = patientRepository.findByUser_Email(currentUserEmail).orElse(null);
        boolean isReceptionistBooking = currentPatient == null;

        // Chỉ check ownership khi patient tự đặt (Receptionist đặt hộ thì bỏ qua)
        if (!isReceptionistBooking
                && !subscription.getPatient().getId().equals(currentPatient.getId())) {
            throw new IllegalArgumentException("Gói đăng ký không thuộc bệnh nhân này");
        }

        // Nếu Receptionist đặt hộ → dùng patient từ subscription
        Patient sessionPatient = isReceptionistBooking
                ? subscription.getPatient()
                : currentPatient;

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

        // Buổi dịch vụ chỉ được đặt trong giờ làm việc của phòng khám (07:30–17:00),
        // giống giờ khám chính — không đặt ngoài giờ hành chính.
        LocalTime bookedTime = request.getScheduledDateTime().toLocalTime();
        if (bookedTime.isBefore(CLINIC_OPEN_TIME) || bookedTime.isAfter(CLINIC_CLOSE_TIME)) {
            throw new IllegalArgumentException(
                    "Thời gian làm dịch vụ phải trong giờ làm việc của phòng khám (07:30–17:00)");
        }

        long activeCount = careSessionRepository.countActiveSessionsBySubscription(subscription.getId());
        int sessionNumber = (int) activeCount + 1;

        CareSession session = CareSession.builder()
                .subscription(subscription)
                .patient(sessionPatient)
                .scheduledDateTime(request.getScheduledDateTime())
                .sessionNumber(sessionNumber)
                .notes(request.getNotes())
                .build();

        // Mở rộng UC-20: thử tự động gán điều dưỡng đang rảnh đúng khung giờ ngay lúc đặt —
        // best-effort, lỗi bất kỳ (hoặc không tìm được ai phù hợp) thì để trống như hành vi cũ.
        try {
            User autoNurse = pickAvailableNurse(request.getScheduledDateTime(), subscription.getService().getDurationMinutes());
            if (autoNurse != null) {
                session.setNurse(autoNurse);
                session.setRoom(resolveRoomForNurse(autoNurse, request.getScheduledDateTime().toLocalDate()));
                session.setAssignedAt(LocalDateTime.now());
            }
        } catch (Exception e) {
            log.error("Tự động phân công điều dưỡng lúc đặt lịch thất bại: {}", e.getMessage());
        }

        CareSession saved = careSessionRepository.save(session);
        CareSessionResponse response = toResponse(saved);
        if (saved.getNurse() != null) {
            notifyNurseAssigned(saved, saved.getNurse());
        }

        // BR-15: trừ buổi ngay khi đặt lịch, chặn overbooking
        subscription.setUsedSessions(subscription.getUsedSessions() + 1);
        if (subscription.getRemainingSessions() <= 0) {
            subscription.setStatus("DEPLETED");
        }
        subscriptionRepository.save(subscription);

        // UC-40 POST-3: thông báo xác nhận đặt lịch thành công
        try {
            Long patientUserId = sessionPatient.getUser() != null
                    ? sessionPatient.getUser().getId()
                    : null;
            notificationService.createForUser(patientUserId,
                    "Đặt buổi chăm sóc thành công — "
                            + subscription.getService().getServiceName()
                            + " (buổi " + sessionNumber + "/" + subscription.getTotalSessions() + ")"
                            + ". Thời gian: " + request.getScheduledDateTime().toLocalDate()
                            + " lúc " + request.getScheduledDateTime().toLocalTime(),
                    null);
        } catch (Exception e) {
            log.error("UC-40: Gửi thông báo book care session thất bại: {}", e.getMessage());
        }

        return response;
    }

    @Override
    public List<CareSessionResponse> getMySessions(String currentUserEmail) {
        return careSessionRepository.findByPatient_User_EmailOrderByScheduledDateTimeDesc(currentUserEmail)
                .stream().map(this::toResponse).collect(Collectors.toList());
    }

    @Override
    public CareSessionResponse getById(Long id, String currentUserEmail) {
        CareSession session = getSessionOrThrow(id);
        User currentUser = userRepository.findByEmail(currentUserEmail)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy người dùng"));
        String role = currentUser.getRole().getName();
        if ("NURSE".equals(role)
                && (session.getNurse() == null || !session.getNurse().getId().equals(currentUser.getId()))) {
            throw new IllegalArgumentException("Bạn không được phân công buổi khám này");
        }
        if ("PATIENT".equals(role)
                && (session.getPatient().getUser() == null
                        || !session.getPatient().getUser().getId().equals(currentUser.getId()))) {
            throw new IllegalArgumentException("Không có quyền xem buổi khám này");
        }
        return toResponse(session);
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
    public List<CareSessionResponse> getNurseQueue(String nurseEmail, LocalDate date) {
        User nurse = userRepository.findByEmail(nurseEmail)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy người dùng"));
        // Không truyền ngày (vd: DeliverCareSessionPage tra cứu theo id) → giữ hành vi cũ,
        // trả toàn bộ buổi đang chờ (BOOKED) bất kể ngày nào.
        if (date == null) {
            return careSessionRepository.findByNurse_IdAndStatusOrderByScheduledDateTimeAsc(nurse.getId(), "BOOKED")
                    .stream().map(this::toResponse).collect(Collectors.toList());
        }
        // Có ngày cụ thể (điều hướng ngày trước/sau trên trang hàng đợi) → trả mọi trạng thái
        // trong ngày đó, giống cách lịch của lễ tân hiển thị cả ngày để dễ chuẩn bị.
        LocalDateTime start = date.atStartOfDay();
        LocalDateTime end = date.plusDays(1).atStartOfDay();
        return careSessionRepository
                .findByNurse_IdAndScheduledDateTimeBetweenOrderByScheduledDateTimeAsc(nurse.getId(), start, end)
                .stream().map(this::toResponse).collect(Collectors.toList());
    }

    @Override
    public List<CareSessionResponse> getSessionsBySubscription(Long subscriptionId) {
        return careSessionRepository.findBySubscription_IdOrderBySessionNumberAsc(subscriptionId)
                .stream().map(this::toResponse).collect(Collectors.toList());
    }

    /** UC-19 E-2: tiền tố đánh dấu lỗi "đã đủ sức chứa" để frontend nhận diện và hỏi lại
     *  Manager có muốn ghi đè (override) hay không, thay vì chỉ báo lỗi và dừng lại. */
    private static final String CAPACITY_EXCEEDED_PREFIX = "CAPACITY_EXCEEDED: ";

    @Override
    @Transactional
    public CareSessionResponse assignNurse(Long id, AssignNurseRequest request, String actorEmail, String ipAddress) {
        CareSession session = getSessionOrThrow(id);
        if (!"BOOKED".equals(session.getStatus())) {
            throw new IllegalStateException("Chỉ có thể phân công điều dưỡng cho buổi chưa bắt đầu");
        }
        User nurse = userRepository.findById(request.getNurseId())
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy điều dưỡng"));
        if (!"NURSE".equals(nurse.getRole().getName())) {
            throw new IllegalArgumentException("Người dùng được chọn không phải điều dưỡng");
        }

        // BR-16: chặn phân công vượt sức chứa buổi/ngày của điều dưỡng (bỏ qua chính buổi này
        // để khi "đổi ĐD" không bị đếm trùng). UC-19 E-2: Manager có thể xác nhận override để
        // vẫn phân công dù đã đủ sức chứa (khác chặn cứng như trước).
        LocalDate sessionDate = session.getScheduledDateTime().toLocalDate();
        long sameDayCount = careSessionRepository.countByNurseOnDateExcluding(
                nurse.getId(), session.getId(),
                sessionDate.atStartOfDay(), sessionDate.plusDays(1).atStartOfDay());
        boolean override = Boolean.TRUE.equals(request.getOverride());
        if (sameDayCount >= MAX_CARE_SESSIONS_PER_NURSE_PER_DAY && !override) {
            throw new IllegalStateException(CAPACITY_EXCEEDED_PREFIX + "Điều dưỡng đã đủ "
                    + MAX_CARE_SESSIONS_PER_NURSE_PER_DAY + " buổi chăm sóc trong ngày, vẫn muốn phân công?");
        }

        User previousNurse = session.getNurse();
        session.setNurse(nurse);
        session.setRoom(resolveRoomForNurse(nurse, sessionDate));
        session.setAssignedAt(LocalDateTime.now());
        CareSession saved = careSessionRepository.save(session);

        notifyNurseAssigned(saved, nurse);
        if (previousNurse != null && !previousNurse.getId().equals(nurse.getId())) {
            notifyNurseRemoved(saved, previousNurse);
        }

        auditLogService.log(resolveActorId(actorEmail),
                previousNurse == null ? "ASSIGN_NURSE" : "REASSIGN_NURSE", "CareSession",
                String.valueOf(saved.getId()),
                previousNurse != null ? Map.of("nurseId", previousNurse.getId(), "nurseName", previousNurse.getFullName()) : null,
                Map.of("nurseId", nurse.getId(), "nurseName", nurse.getFullName()), ipAddress);

        return toResponse(saved);
    }

    @Override
    @Transactional
    public AutoAssignResult autoAssignRemaining(LocalDate date, String actorEmail, String ipAddress) {
        LocalDateTime start = date.atStartOfDay();
        LocalDateTime end = date.plusDays(1).atStartOfDay();

        List<CareSession> unassigned = careSessionRepository.findUnassignedBookedOnDate(start, end);
        List<User> nurses = userRepository.findByRole_Name("NURSE");

        // Tải hiện tại của từng điều dưỡng trong ngày — chọn người ít việc nhất trước (chia đều).
        Map<Long, Long> loadByNurse = new HashMap<>();
        for (User nurse : nurses) {
            loadByNurse.put(nurse.getId(), careSessionRepository.countByNurseOnDate(nurse.getId(), start, end));
        }

        List<CareSessionResponse> assigned = new ArrayList<>();
        int stillUnassigned = 0;

        for (CareSession session : unassigned) {
            User pick = nurses.stream()
                    .filter(n -> loadByNurse.get(n.getId()) < MAX_CARE_SESSIONS_PER_NURSE_PER_DAY)
                    .min(Comparator.comparingLong(n -> loadByNurse.get(n.getId())))
                    .orElse(null);
            if (pick == null) {
                stillUnassigned++;
                continue;
            }
            session.setNurse(pick);
            session.setRoom(resolveRoomForNurse(pick, date));
            session.setAssignedAt(LocalDateTime.now());
            CareSession saved = careSessionRepository.save(session);
            loadByNurse.put(pick.getId(), loadByNurse.get(pick.getId()) + 1);
            notifyNurseAssigned(saved, pick);
            assigned.add(toResponse(saved));
        }

        if (!assigned.isEmpty()) {
            auditLogService.log(resolveActorId(actorEmail), "AUTO_ASSIGN_NURSE", "CareSession",
                    date.toString(), null,
                    Map.of("assignedCount", assigned.size(), "date", date.toString()), ipAddress);
        }

        return AutoAssignResult.builder()
                .assignedCount(assigned.size())
                .stillUnassignedCount(stillUnassigned)
                .assignedSessions(assigned)
                .build();
    }

    private void notifyNurseAssigned(CareSession session, User nurse) {
        try {
            notificationService.createForUser(nurse.getId(),
                    "Bạn được phân công buổi chăm sóc cho " + session.getPatient().getFullName()
                            + " lúc " + session.getScheduledDateTime().toLocalTime()
                            + " ngày " + session.getScheduledDateTime().toLocalDate(),
                    null);
        } catch (Exception e) {
            log.error("UC-19: Gửi thông báo phân công điều dưỡng thất bại: {}", e.getMessage());
        }
    }

    private void notifyNurseRemoved(CareSession session, User previousNurse) {
        try {
            notificationService.createForUser(previousNurse.getId(),
                    "Buổi chăm sóc cho " + session.getPatient().getFullName()
                            + " lúc " + session.getScheduledDateTime().toLocalTime()
                            + " ngày " + session.getScheduledDateTime().toLocalDate()
                            + " đã được chuyển cho điều dưỡng khác",
                    null);
        } catch (Exception e) {
            log.error("UC-19 ALT-2: Gửi thông báo gỡ phân công điều dưỡng thất bại: {}", e.getMessage());
        }
    }

    private Long resolveActorId(String actorEmail) {
        if (actorEmail == null) return null;
        return userRepository.findByEmail(actorEmail).map(User::getId).orElse(null);
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
        // Khách phải check-in tại quầy lễ tân trước khi điều dưỡng được bắt đầu — cùng luồng
        // check-in đã có ở lịch khám bác sĩ, tránh gọi bệnh nhân khi họ chưa thực sự có mặt.
        if (!Boolean.TRUE.equals(session.getCheckedIn())) {
            throw new IllegalStateException("Bệnh nhân chưa check-in tại quầy lễ tân");
        }
        session.setStatus("IN_PROGRESS");
        session.setStartedAt(LocalDateTime.now());
        return toResponse(careSessionRepository.save(session));
    }

    @Override
    @Transactional
    public CareSessionResponse checkInSession(Long id, String receptionistEmail) {
        CareSession session = getSessionOrThrow(id);
        if (!"BOOKED".equals(session.getStatus())) {
            throw new IllegalStateException("Chỉ có thể check-in buổi khám đang chờ");
        }
        if (Boolean.TRUE.equals(session.getCheckedIn())) {
            throw new IllegalStateException("Buổi khám này đã check-in rồi");
        }
        User receptionist = userRepository.findByEmail(receptionistEmail)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy người dùng"));
        session.setCheckedIn(true);
        session.setCheckInAt(LocalDateTime.now());
        session.setCheckInBy(receptionist);
        return toResponse(careSessionRepository.save(session));
    }

    @Override
    @Transactional
    public CareSessionResponse completeSession(Long id, String nurseNotes, Boolean isIncident, String nurseEmail) {
        CareSession session = getSessionOrThrow(id);
        User nurse = userRepository.findByEmail(nurseEmail)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy người dùng"));

        if (!"IN_PROGRESS".equals(session.getStatus())) {
            throw new IllegalStateException("Buổi khám chưa được bắt đầu");
        }
        if (session.getNurse() == null || !session.getNurse().getId().equals(nurse.getId())) {
            throw new IllegalArgumentException("Bạn không được phân công buổi khám này");
        }
        // UC-32 E-1: phải có ghi chú điều dưỡng mới được hoàn thành (chốt lại ở backend,
        // không chỉ dựa vào validate ở frontend). Khi đánh dấu sự cố, ghi chú này đóng vai trò
        // báo cáo sự cố bắt buộc (ALT-1) — không cần trường riêng.
        if (nurseNotes == null || nurseNotes.isBlank()) {
            throw new IllegalArgumentException("Vui lòng nhập ghi chú buổi khám trước khi hoàn thành");
        }
        boolean incident = Boolean.TRUE.equals(isIncident);
        session.setStatus("COMPLETED");
        session.setNurseNotes(nurseNotes.trim());
        session.setCompletedAt(LocalDateTime.now());
        session.setIsIncident(incident);
        CareSession saved = careSessionRepository.save(session);

        // UC-32 POST-3: báo Lễ tân buổi đã xong, sẵn sàng check-out.
        try {
            notificationService.createForReceptionists(
                    "Buổi chăm sóc của " + saved.getPatient().getFullName()
                            + " (" + saved.getSubscription().getService().getServiceName() + ") đã hoàn thành, sẵn sàng check-out",
                    null);
        } catch (Exception e) {
            log.error("UC-32: Gửi thông báo hoàn thành buổi khám cho lễ tân thất bại: {}", e.getMessage());
        }

        // UC-32 ALT-1: bệnh nhân có phản ứng/sự cố → báo Clinic Manager xem xét.
        if (incident) {
            try {
                notificationService.createForRole("MANAGER",
                        "⚠️ Sự cố trong buổi chăm sóc của " + saved.getPatient().getFullName()
                                + ": " + saved.getNurseNotes(),
                        null);
            } catch (Exception e) {
                log.error("UC-32 ALT-1: Gửi thông báo sự cố cho Manager thất bại: {}", e.getMessage());
            }
        }

        return toResponse(saved);
    }

    @Override
    @Transactional
    public CareSessionResponse checkoutSession(Long id, String receptionistEmail) {
        CareSession session = getSessionOrThrow(id);

        if (!"COMPLETED".equals(session.getStatus())) {
            throw new IllegalStateException("Buổi khám chưa hoàn thành");
        }

        // BR-15: buổi đã bị trừ lúc book(), checkout chỉ chuyển trạng thái.
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

        // BR-05: bệnh nhân chỉ được huỷ trước giờ hẹn ≥1h.
        // Staff (Receptionist/Manager/Admin) không bị ràng buộc.
        Patient currentPatient = patientRepository.findByUser_Email(currentUserEmail).orElse(null);
        boolean isPatientSelf = currentPatient != null
                && session.getPatient().getId().equals(currentPatient.getId());

        if (isPatientSelf && session.getScheduledDateTime().isBefore(LocalDateTime.now().plusHours(1))) {
            throw new IllegalStateException(
                    "Buổi khám chỉ có thể huỷ trước giờ hẹn ít nhất 1 giờ. "
                            + "Vui lòng liên hệ trực tiếp phòng khám.");
        }

        // UC-40 ALT-2: hoàn lại buổi cho subscription khi huỷ (đã trừ lúc book)
        PatientServiceSubscription subscription = session.getSubscription();
        subscription.setUsedSessions(Math.max(0, subscription.getUsedSessions() - 1));
        // Nếu subscription đã DEPLETED nhưng giờ có buổi hoàn → ACTIVE lại
        if ("DEPLETED".equals(subscription.getStatus()) && subscription.getRemainingSessions() > 0) {
            subscription.setStatus("ACTIVE");
        }
        subscriptionRepository.save(subscription);

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
                .subscriptionFinalPrice(sub.getFinalPrice())
                .subscriptionInvoiced(invoiceRepository.existsBySubscription_IdAndStatusNot(sub.getId(), "CANCELLED"))
                .patientId(s.getPatient().getId())
                .patientName(s.getPatient().getFullName())
                .patientCode(s.getPatient().getPatientCode())
                .patientPhone(s.getPatient().getPhone())
                .patientDob(s.getPatient().getDateOfBirth())
                .patientGender(s.getPatient().getGender())
                .nurseId(s.getNurse() != null ? s.getNurse().getId() : null)
                .nurseName(s.getNurse() != null ? s.getNurse().getFullName() : null)
                .roomId(s.getRoom() != null ? s.getRoom().getId() : null)
                .roomName(s.getRoom() != null ? s.getRoom().getName() : null)
                .scheduledDateTime(s.getScheduledDateTime())
                .status(s.getStatus())
                .sessionNumber(s.getSessionNumber())
                .totalSessions(sub.getTotalSessions())
                .remainingSessions(sub.getRemainingSessions())
                .notes(s.getNotes())
                .nurseNotes(s.getNurseNotes())
                .checkedIn(s.getCheckedIn())
                .checkInAt(s.getCheckInAt())
                .startedAt(s.getStartedAt())
                .completedAt(s.getCompletedAt())
                // UC-32: thời lượng thực hiện — tính từ startedAt/completedAt, không lưu riêng.
                .durationMinutes(s.getStartedAt() != null && s.getCompletedAt() != null
                        ? Duration.between(s.getStartedAt(), s.getCompletedAt()).toMinutes()
                        : null)
                .isIncident(s.getIsIncident())
                .assignedAt(s.getAssignedAt())
                .createdAt(s.getCreatedAt())
                .build();
    }
}
