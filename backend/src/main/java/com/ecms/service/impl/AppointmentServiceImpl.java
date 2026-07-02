package com.ecms.service.impl;

import com.ecms.dto.request.BookAppointmentRequest;
import com.ecms.dto.request.CancelAppointmentRequest;
import com.ecms.dto.request.ReassignAppointmentRequest;
import com.ecms.dto.request.RescheduleAppointmentRequest;
import com.ecms.dto.request.UpdateAppointmentNotesRequest;
import com.ecms.dto.request.WalkInAppointmentRequest;
import com.ecms.dto.response.AppointmentDashboardResponse;
import com.ecms.dto.response.AppointmentResponse;
import com.ecms.dto.response.SlotAvailabilityResponse;
import com.ecms.entity.*;
import com.ecms.exception.ResourceNotFoundException;
import com.ecms.repository.AppointmentRepository;
import com.ecms.repository.ClinicServiceRepository;
import com.ecms.repository.DoctorRepository;
import com.ecms.repository.MedicalRecordRepository;
import com.ecms.repository.PatientRepository;
import com.ecms.repository.UserRepository;
import com.ecms.service.AppointmentService;
import com.ecms.service.EmailService;
import com.ecms.service.NotificationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

import org.apache.coyote.BadRequestException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class AppointmentServiceImpl implements AppointmentService {

        private static final int MAX_APPOINTMENTS_PER_DOCTOR_PER_DAY = 30;

        /** Đặt lịch online phải trước giờ khám tối thiểu 2 giờ (BR-04). */
        private static final int BOOKING_LEAD_TIME_MINUTES = 120;

        /** Giờ làm việc cố định của phòng khám (cách nhau 30 phút). */
        private static final List<LocalTime> MORNING_SLOTS = List.of(
                        LocalTime.of(7, 30), LocalTime.of(8, 0), LocalTime.of(8, 30), LocalTime.of(9, 0),
                        LocalTime.of(9, 30), LocalTime.of(10, 0), LocalTime.of(10, 30), LocalTime.of(11, 0));
        private static final List<LocalTime> AFTERNOON_SLOTS = List.of(
                        LocalTime.of(13, 30), LocalTime.of(14, 0), LocalTime.of(14, 30), LocalTime.of(15, 0),
                        LocalTime.of(15, 30), LocalTime.of(16, 0), LocalTime.of(16, 30));
        private static final DateTimeFormatter SLOT_FMT = DateTimeFormatter.ofPattern("HH:mm");
        /** Toàn bộ khung giờ hợp lệ (sáng + chiều) — dùng để validate giờ vãng lai. */
        private static final Set<LocalTime> ALL_SLOTS;
        static {
                Set<LocalTime> s = new java.util.HashSet<>();
                s.addAll(MORNING_SLOTS);
                s.addAll(AFTERNOON_SLOTS);
                ALL_SLOTS = java.util.Collections.unmodifiableSet(s);
        }

        private final AppointmentRepository appointmentRepository;
        private final DoctorRepository doctorRepository;
        private final PatientRepository patientRepository;
        private final ClinicServiceRepository clinicServiceRepository;
        private final UserRepository userRepository;
        private final NotificationService notificationService;
        private final EmailService emailService;
        private final MedicalRecordRepository medicalRecordRepository;

        @Override
        @Transactional(readOnly = true)
        public List<AppointmentResponse> getTodayAppointments() {
                LocalDate today = LocalDate.now();
                LocalDateTime start = today.atStartOfDay();
                LocalDateTime end = today.plusDays(1).atStartOfDay();

                return appointmentRepository
                                .findByAppointmentDateOrderByTimeSlotAsc(start, end)
                                .stream()
                                .map(this::toResponse)
                                .collect(Collectors.toList());
        }

        @Override
        public List<AppointmentResponse> getAllAppointments() {
                return appointmentRepository.findAllWithDetails()
                                .stream()
                                .map(this::toResponse)
                                .collect(Collectors.toList());
        }

        @Override
        public List<AppointmentResponse> searchAppointments(String keyword) {
                if (keyword == null || keyword.trim().isEmpty()) {
                        return getAllAppointments();
                }

                return appointmentRepository.searchAppointments(keyword.trim())
                                .stream()
                                .map(this::toResponse)
                                .collect(Collectors.toList());
        }

        @Override
        public List<AppointmentResponse> getDoctorQueue(LocalDate date) {
                LocalDate targetDate = date != null ? date : LocalDate.now();
                LocalDateTime start = targetDate.atStartOfDay();
                LocalDateTime end = targetDate.plusDays(1).atStartOfDay();

                return appointmentRepository
                                .findByAppointmentDateAndStatusOrderByCreatedAtAsc(
                                                start,
                                                end,
                                                AppointmentStatus.WAITING)
                                .stream()
                                .map(this::toResponse)
                                .collect(Collectors.toList());
        }

        @Override
        public AppointmentDashboardResponse getDashboard(LocalDate date) {
                LocalDate targetDate = date != null ? date : LocalDate.now();
                LocalDateTime start = targetDate.atStartOfDay();
                LocalDateTime end = targetDate.plusDays(1).atStartOfDay();

                return AppointmentDashboardResponse.builder()
                                .total(appointmentRepository.countByDate(start, end))
                                .pending(appointmentRepository.countByDateAndStatus(start, end,
                                                AppointmentStatus.PENDING))
                                .confirmed(appointmentRepository.countByDateAndStatus(start, end,
                                                AppointmentStatus.CONFIRMED))
                                .waiting(appointmentRepository.countByDateAndStatus(start, end,
                                                AppointmentStatus.WAITING))
                                .inProgress(appointmentRepository.countByDateAndStatus(start, end,
                                                AppointmentStatus.IN_PROGRESS))
                                .completed(appointmentRepository.countByDateAndStatus(start, end,
                                                AppointmentStatus.COMPLETED))
                                .cancelled(appointmentRepository.countByDateAndStatus(start, end,
                                                AppointmentStatus.CANCELLED))
                                .build();
        }

        @Override
        public List<AppointmentResponse> getDoctorQueue(LocalDate date, Long doctorId) {
                LocalDate targetDate = date != null ? date : LocalDate.now();
                LocalDateTime start = targetDate.atStartOfDay();
                LocalDateTime end = targetDate.plusDays(1).atStartOfDay();

                return appointmentRepository.findByAppointmentDateAndDoctorIdOrderByAppointmentTimeAsc(start, end,
                                doctorId)
                                .stream()
                                .map(this::toResponse)
                                .collect(Collectors.toList());
        }

        @Override
        public AppointmentDashboardResponse getDashboard(LocalDate date, Long doctorId) {
                LocalDate targetDate = date != null ? date : LocalDate.now();
                LocalDateTime start = targetDate.atStartOfDay();
                LocalDateTime end = targetDate.plusDays(1).atStartOfDay();

                return AppointmentDashboardResponse.builder()
                                .total(appointmentRepository.countByDateAndDoctorId(start, end, doctorId))
                                .pending(appointmentRepository.countByDateAndStatusAndDoctorId(start, end,
                                                AppointmentStatus.PENDING,
                                                doctorId))
                                .confirmed(appointmentRepository.countByDateAndStatusAndDoctorId(start, end,
                                                AppointmentStatus.CONFIRMED, doctorId))
                                .waiting(appointmentRepository.countByDateAndStatusAndDoctorId(start, end,
                                                AppointmentStatus.WAITING,
                                                doctorId))
                                .inProgress(appointmentRepository.countByDateAndStatusAndDoctorId(start, end,
                                                AppointmentStatus.IN_PROGRESS, doctorId))
                                .completed(appointmentRepository.countByDateAndStatusAndDoctorId(start, end,
                                                AppointmentStatus.COMPLETED, doctorId))
                                .cancelled(appointmentRepository.countByDateAndStatusAndDoctorId(start, end,
                                                AppointmentStatus.CANCELLED, doctorId))
                                .build();
        }

        @Override
        @Transactional
        public AppointmentResponse updateAppointmentStatus(Long id, AppointmentStatus status) {
                Appointment appointment = appointmentRepository.findById(id)
                                .orElseThrow(() -> new ResourceNotFoundException("Lịch hẹn không tồn tại: " + id));

                appointment.setStatus(status);

                return toResponse(appointmentRepository.save(appointment));
        }

        @Override
        @Transactional
        public AppointmentResponse confirmAppointment(Long id, Long doctorId) {
                return confirmAppointment(id, doctorId, null);
        }

        @Override
        @Transactional
        public AppointmentResponse confirmAppointment(Long id, Long doctorId, String reason) {
                Appointment appointment = appointmentRepository.findById(id)
                                .orElseThrow(() -> new ResourceNotFoundException("Lịch hẹn không tồn tại: " + id));

                if (appointment.getStatus() != AppointmentStatus.PENDING) {
                        throw new IllegalStateException("Chỉ lịch hẹn PENDING mới được xác nhận");
                }

                if (doctorId != null) {
                        Doctor doctor = doctorRepository.findById(doctorId)
                                        .orElseThrow(() -> new ResourceNotFoundException(
                                                        "Bác sĩ không tồn tại: " + doctorId));

                        // Lễ tân đổi sang bác sĩ KHÁC với bác sĩ bệnh nhân đã đặt → bắt buộc có lý do
                        Doctor oldDoctor = appointment.getDoctor();
                        boolean doctorChanged = oldDoctor != null && !oldDoctor.getId().equals(doctorId);
                        if (doctorChanged && (reason == null || reason.isBlank())) {
                                throw new IllegalArgumentException("Vui lòng nhập lý do đổi bác sĩ");
                        }

                        validateDoctorCapacity(doctorId, appointment.getAppointmentDate());
                        appointment.setDoctor(doctor);

                        // Lưu vết lý do đổi bác sĩ vào notes (giữ nguyên note gốc) — giống luồng chuyển
                        // lịch
                        if (doctorChanged) {
                                String original = appointment.getNotes();
                                appointment.setNotes(
                                                (original != null && !original.isBlank() ? original + " | " : "")
                                                                + "Đổi bác sĩ (" + oldDoctor.getFullName() + " → "
                                                                + doctor.getFullName() + "): " + reason.trim());
                        }
                }

                appointment.setStatus(AppointmentStatus.CONFIRMED);
                Appointment saved = appointmentRepository.save(appointment);

                // Gửi thông báo in-app cho bệnh nhân khi lịch hẹn được xác nhận
                try {
                        Long patientUserId = saved.getPatient() != null && saved.getPatient().getUser() != null
                                        ? saved.getPatient().getUser().getId()
                                        : null;
                        if (patientUserId != null) {
                                String timeStr = saved.getAppointmentTime() != null
                                                ? saved.getAppointmentTime().toLocalTime().toString()
                                                : "";
                                String dateStr = saved.getAppointmentTime() != null
                                                ? saved.getAppointmentTime().toLocalDate().toString()
                                                : "";
                                notificationService.createForUser(patientUserId,
                                                "Lịch hẹn khám của bạn vào lúc " + timeStr + " ngày " + dateStr
                                                                + " đã được xác nhận.",
                                                saved.getId());
                        }
                } catch (Exception e) {
                        log.error("Lỗi khi gửi thông báo xác nhận lịch hẹn: {}", e.getMessage());
                }

                return toResponse(saved);
        }

        @Override
        @Transactional
        public AppointmentResponse checkInAppointment(Long id, Long checkInByUserId) {
                Appointment appointment = appointmentRepository.findById(id)
                                .orElseThrow(() -> new ResourceNotFoundException("Lịch hẹn không tồn tại: " + id));

                if (appointment.getStatus() != AppointmentStatus.CONFIRMED) {
                        // E2: bệnh nhân đã được check-in trước đó → báo rõ kèm số thứ tự đã cấp.
                        if (appointment.getStatus() == AppointmentStatus.WAITING
                                        || appointment.getStatus() == AppointmentStatus.IN_PROGRESS
                                        || appointment.getStatus() == AppointmentStatus.COMPLETED) {
                                throw new IllegalStateException(
                                                "Bệnh nhân đã được check-in trước đó (Số thứ tự: "
                                                                + appointment.getQueueNumber() + ")");
                        }
                        throw new IllegalStateException("Chỉ lịch hẹn CONFIRMED mới được check-in");
                }

                LocalDate appointmentDate = appointment.getAppointmentDate();
                appointment.setStatus(AppointmentStatus.WAITING);
                appointment.setCheckInTime(LocalDateTime.now());
                // UC-15: lưu lại id nhân viên (Lễ tân) thực hiện check-in.
                appointment.setCheckInBy(checkInByUserId);

                if (appointment.getQueueNumber() == null) {
                        Long doctorId = appointment.getDoctor() != null ? appointment.getDoctor().getId() : null;
                        appointment.setQueueNumber(nextQueueNumber(doctorId, appointmentDate));
                }

                return toResponse(appointmentRepository.save(appointment));
        }

        @Override
        @Transactional
        public AppointmentResponse bookOnlineAppointment(BookAppointmentRequest request, String patientEmail) {
                Patient selfPatient = patientRepository.findByUser_Email(patientEmail)
                                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy thông tin bệnh nhân"));
                Long bookedByUserId = userRepository.findByEmail(patientEmail).map(User::getId).orElse(null);

                Doctor doctor = doctorRepository.findById(request.getDoctorId())
                                .orElseThrow(() -> new ResourceNotFoundException(
                                                "Bác sĩ không tồn tại: " + request.getDoctorId()));

                LocalDateTime appointmentTime = request.getAppointmentTime();

                // Phải đặt trước giờ khám tối thiểu BOOKING_LEAD_TIME_MINUTES phút
                // (đã bao gồm luôn việc chặn đặt vào quá khứ)
                if (appointmentTime.isBefore(LocalDateTime.now().plusMinutes(BOOKING_LEAD_TIME_MINUTES))) {
                        throw new IllegalArgumentException(
                                        "Vui lòng đặt lịch trước giờ khám ít nhất " + BOOKING_LEAD_TIME_MINUTES
                                                        + " phút");
                }

                // Chặn đặt trùng khung giờ của cùng một bác sĩ (mọi trạng thái trừ CANCELLED)
                boolean slotTaken = appointmentRepository.existsByDoctor_IdAndAppointmentTimeAndStatusNot(
                                doctor.getId(), appointmentTime, AppointmentStatus.CANCELLED);
                if (slotTaken) {
                        throw new IllegalStateException(
                                        "Khung giờ này vừa có người đặt, vui lòng chọn khung giờ khác");
                }

                validateDoctorCapacity(doctor.getId(), appointmentTime.toLocalDate());

                // UC-46: gắn dịch vụ khám nếu bệnh nhân chọn từ trang Dịch vụ khám mắt
                ClinicService clinicService = null;
                if (request.getServiceId() != null) {
                        clinicService = clinicServiceRepository.findById(request.getServiceId())
                                        .orElseThrow(
                                                        () -> new ResourceNotFoundException("Dịch vụ không tồn tại: "
                                                                        + request.getServiceId()));
                }

                // UC-11: xác định bệnh nhân thực sự được khám.
                Patient targetPatient = resolveBookingPatient(request, selfPatient);

                Appointment appointment = Appointment.builder()
                                .patient(targetPatient)
                                .bookedBy(bookedByUserId)
                                .doctor(doctor)
                                .clinicService(clinicService)
                                .appointmentTime(appointmentTime)
                                .timeSlot(appointmentTime.toLocalTime().format(SLOT_FMT))
                                .status(AppointmentStatus.PENDING)
                                .type("ONLINE")
                                .reminderSent(false)
                                .notes(request.getNotes())
                                .build();

                return toResponse(appointmentRepository.save(appointment));
        }

        /**
         * Xác định bệnh nhân được khám cho 1 lượt đặt online (UC-11):
         * - Đặt hộ người thân: tạo hồ sơ Patient MỚI (không gắn tài khoản) từ thông
         * tin nhập trong form. Lịch hẹn sẽ gắn patient = người thân, còn booked_by
         * = tài khoản người đặt (để vẫn xem được ở "Lịch hẹn của tôi").
         * - Đặt cho mình: dùng hồ sơ của tài khoản; bổ sung các trường còn trống
         * (giới tính/ngày sinh/địa chỉ/SĐT) nếu form có gửi lên, không ghi đè dữ liệu
         * cũ.
         */
        private Patient resolveBookingPatient(BookAppointmentRequest request, Patient selfPatient) {
                if (request.isBookingForOther()) {
                        if (isBlank(request.getPatientName()) || isBlank(request.getPatientPhone())
                                        || request.getPatientDob() == null) {
                                throw new IllegalArgumentException(
                                                "Vui lòng nhập đầy đủ họ tên, số điện thoại và ngày sinh của người khám");
                        }
                        Patient relative = Patient.builder()
                                        .patientCode(nextPatientCode())
                                        .fullName(request.getPatientName().trim())
                                        .gender(request.getPatientGender())
                                        .dateOfBirth(request.getPatientDob())
                                        .phone(request.getPatientPhone().trim())
                                        .email(isBlank(request.getPatientEmail()) ? null
                                                        : request.getPatientEmail().trim())
                                        .address(isBlank(request.getPatientAddress()) ? null
                                                        : request.getPatientAddress().trim())
                                        .build();
                        return patientRepository.save(relative);
                }

                // Đặt cho mình: bổ sung trường còn trống, không ghi đè dữ liệu sẵn có
                boolean changed = false;
                if (isBlank(selfPatient.getGender()) && !isBlank(request.getPatientGender())) {
                        selfPatient.setGender(request.getPatientGender());
                        changed = true;
                }
                if (selfPatient.getDateOfBirth() == null && request.getPatientDob() != null) {
                        selfPatient.setDateOfBirth(request.getPatientDob());
                        changed = true;
                }
                if (isBlank(selfPatient.getAddress()) && !isBlank(request.getPatientAddress())) {
                        selfPatient.setAddress(request.getPatientAddress().trim());
                        changed = true;
                }
                if (isBlank(selfPatient.getPhone()) && !isBlank(request.getPatientPhone())) {
                        selfPatient.setPhone(request.getPatientPhone().trim());
                        changed = true;
                }
                return changed ? patientRepository.save(selfPatient) : selfPatient;
        }

        /**
         * Sinh mã bệnh nhân kế tiếp dạng PT0001, PT0002,... (giống PatientServiceImpl).
         */
        private String nextPatientCode() {
                return String.format("PT%04d", patientRepository.count() + 1);
        }

        private static boolean isBlank(String s) {
                return s == null || s.isBlank();
        }

        @Override
        @Transactional(readOnly = true)
        public List<SlotAvailabilityResponse> getAvailableSlots(Long doctorId, LocalDate date) {
                if (!doctorRepository.existsById(doctorId)) {
                        throw new ResourceNotFoundException("Bác sĩ không tồn tại: " + doctorId);
                }

                // Chủ nhật phòng khám nghỉ
                if (date.getDayOfWeek() == java.time.DayOfWeek.SUNDAY) {
                        return List.of();
                }

                LocalDateTime start = date.atStartOfDay();
                LocalDateTime end = date.plusDays(1).atStartOfDay();

                Set<LocalTime> bookedTimes = appointmentRepository
                                .findBookedTimesByDoctorAndDate(doctorId, start, end)
                                .stream()
                                .map(dt -> dt.toLocalTime().withSecond(0).withNano(0))
                                .collect(Collectors.toSet());

                // Slot phải cách thời điểm hiện tại tối thiểu BOOKING_LEAD_TIME_MINUTES phút
                LocalDateTime cutoff = LocalDateTime.now().plusMinutes(BOOKING_LEAD_TIME_MINUTES);
                List<SlotAvailabilityResponse> slots = new ArrayList<>();
                addSlots(slots, MORNING_SLOTS, "MORNING", date, bookedTimes, cutoff);
                addSlots(slots, AFTERNOON_SLOTS, "AFTERNOON", date, bookedTimes, cutoff);
                return slots;
        }

        private void addSlots(List<SlotAvailabilityResponse> out, List<LocalTime> times, String session,
                        LocalDate date, Set<LocalTime> bookedTimes, LocalDateTime cutoff) {
                for (LocalTime t : times) {
                        boolean tooSoon = date.atTime(t).isBefore(cutoff);
                        boolean taken = bookedTimes.contains(t);
                        out.add(SlotAvailabilityResponse.builder()
                                        .time(t.format(SLOT_FMT))
                                        .session(session)
                                        .available(!tooSoon && !taken)
                                        .build());
                }
        }

        @Override
        @Transactional
        public AppointmentResponse createWalkInAppointment(WalkInAppointmentRequest request) {
                Patient patient = patientRepository.findById(request.getPatientId())
                                .orElseThrow(() -> new ResourceNotFoundException(
                                                "Bệnh nhân không tồn tại: " + request.getPatientId()));

                LocalDateTime walkInTime = request.getAppointmentTime();

                if (walkInTime.isBefore(LocalDateTime.now())) {
                        throw new IllegalArgumentException("Không thể tạo lịch khám trong quá khứ");
                }

                // Vãng lai = bệnh nhân đang có mặt tại phòng khám → chỉ áp dụng cho HÔM NAY.
                // Muốn đặt cho ngày khác phải dùng chức năng đặt lịch (online/PENDING).
                if (!walkInTime.toLocalDate().isEqual(LocalDate.now())) {
                        throw new IllegalArgumentException(
                                        "Lịch khám vãng lai chỉ áp dụng cho hôm nay. Vui lòng dùng chức năng đặt lịch hẹn cho ngày khác.");
                }

                // Giờ khám phải khớp lưới khung giờ làm việc của phòng khám (giống đặt lịch
                // online)
                if (!ALL_SLOTS.contains(walkInTime.toLocalTime())) {
                        throw new IllegalArgumentException(
                                        "Giờ khám không hợp lệ, vui lòng chọn theo khung giờ làm việc của phòng khám");
                }

                Doctor doctor = doctorRepository.findById(request.getDoctorId())
                                .orElseThrow(() -> new ResourceNotFoundException(
                                                "Bác sĩ không tồn tại: " + request.getDoctorId()));

                validateDoctorCapacity(request.getDoctorId(), walkInTime.toLocalDate());

                ClinicService clinicService = null;
                if (request.getServiceId() != null) {
                        clinicService = clinicServiceRepository.findById(request.getServiceId())
                                        .orElseThrow(
                                                        () -> new ResourceNotFoundException("Dịch vụ không tồn tại: "
                                                                        + request.getServiceId()));
                }

                LocalDate appointmentDate = walkInTime.toLocalDate();

                Appointment appointment = Appointment.builder()
                                .patient(patient)
                                .doctor(doctor)
                                .clinicService(clinicService)
                                .appointmentTime(walkInTime)
                                .timeSlot(walkInTime.toLocalTime().format(SLOT_FMT))
                                .status(AppointmentStatus.WAITING)
                                .type("WALK_IN")
                                .queueNumber(nextQueueNumber(request.getDoctorId(), appointmentDate))
                                .checkInTime(LocalDateTime.now())
                                .reminderSent(false)
                                .notes(request.getNotes())
                                .build();

                return toResponse(appointmentRepository.save(appointment));
        }

        @Override
        @Transactional
        public AppointmentResponse reassignAppointment(Long id, ReassignAppointmentRequest request) {
                Appointment appointment = appointmentRepository.findById(id)
                                .orElseThrow(() -> new ResourceNotFoundException("Lịch hẹn không tồn tại: " + id));

                if (appointment.getStatus() == AppointmentStatus.COMPLETED
                                || appointment.getStatus() == AppointmentStatus.CANCELLED) {
                        throw new IllegalStateException("Không thể chuyển lịch hẹn đã hoàn thành hoặc đã huỷ");
                }

                // UC-18: lưu thông tin CŨ trước khi overwrite để gửi mail đúng cho cả 2 bác sĩ
                Doctor oldDoctor = appointment.getDoctor();
                LocalDateTime oldTime = appointment.getAppointmentTime();

                boolean doctorChanged = false;
                if (request.getDoctorId() != null) {
                        Doctor doctor = doctorRepository.findById(request.getDoctorId())
                                        .orElseThrow(() -> new ResourceNotFoundException(
                                                        "Bác sĩ không tồn tại: " + request.getDoctorId()));
                        doctorChanged = oldDoctor == null || !oldDoctor.getId().equals(doctor.getId());
                        appointment.setDoctor(doctor);
                }

                if (request.getNewAppointmentTime() != null) {
                        appointment.setAppointmentTime(request.getNewAppointmentTime());
                        appointment.setTimeSlot(request.getNewAppointmentTime().toLocalTime().toString());
                }

                // UC-18: fix bug overwrite notes — append lý do chuyển lịch, giữ nguyên note
                // gốc
                if (request.getReason() != null) {
                        String original = appointment.getNotes();
                        appointment.setNotes(
                                        (original != null && !original.isBlank() ? original + " | " : "")
                                                        + "Lý do chuyển lịch: " + request.getReason());
                }

                AppointmentResponse response = toResponse(appointmentRepository.save(appointment));

                // UC-18: gửi email + in-app notification cho patient / bác sĩ cũ / bác sĩ mới.
                // Bọc try-catch riêng: lỗi gửi mail KHÔNG được rollback transaction reassign.
                try {
                        sendReassignNotifications(appointment, oldDoctor, oldTime, doctorChanged);
                } catch (Exception e) {
                        log.error("UC-18: Gửi thông báo reassign thất bại cho appointment {}: {}",
                                        id, e.getMessage());
                }

                return response;
        }

        /**
         * UC-18 (POST-2): gửi email + in-app notification khi reassign appointment.
         * Không ném ngoại lệ ra ngoài — mọi lỗi đều được log lại.
         */
        private void sendReassignNotifications(Appointment appointment, Doctor oldDoctor,
                        LocalDateTime oldTime, boolean doctorChanged) {
                LocalDateTime newTime = appointment.getAppointmentTime();
                Doctor newDoctor = appointment.getDoctor();
                Patient patient = appointment.getPatient();
                String newDoctorName = newDoctor != null ? newDoctor.getFullName() : null;

                // 1. Email cho bệnh nhân
                if (patient != null) {
                        String patientEmail = patient.getEmail();
                        // Ưu tiên email trên user account nếu có, fallback email trên hồ sơ bệnh nhân
                        if ((patientEmail == null || patientEmail.isBlank()) && patient.getUser() != null) {
                                patientEmail = patient.getUser().getEmail();
                        }
                        emailService.sendReassignmentNotice(patientEmail, patient.getFullName(),
                                        oldTime, newTime, doctorChanged ? newDoctorName : null);

                        // In-app notification cho bệnh nhân
                        Long patientUserId = patient.getUser() != null ? patient.getUser().getId() : null;
                        notificationService.createForUser(patientUserId,
                                        "Lịch khám của bạn đã được chuyển. Nhấn để xem chi tiết.",
                                        appointment.getId());
                }

                // 2. Email cho bác sĩ CŨ (chỉ khi đổi bác sĩ)
                if (doctorChanged && oldDoctor != null) {
                        String patientName = patient != null ? patient.getFullName() : "(không rõ)";
                        emailService.sendReassignmentNotice(oldDoctor.getEmail(), oldDoctor.getFullName(),
                                        oldTime, newTime, null);

                        // In-app notification cho bác sĩ cũ
                        Long oldDoctorUserId = oldDoctor.getUser() != null ? oldDoctor.getUser().getId() : null;
                        notificationService.createForUser(oldDoctorUserId,
                                        "Bạn không còn phụ trách lịch hẹn lúc "
                                                        + oldTime.toLocalTime() + " của bệnh nhân " + patientName,
                                        appointment.getId());
                }

                // 3. Email cho bác sĩ MỚI
                if (newDoctor != null) {
                        String patientName = patient != null ? patient.getFullName() : "(không rõ)";
                        if (doctorChanged) {
                                // Đổi bác sĩ → thông báo "được phân công mới"
                                emailService.sendReassignmentNotice(newDoctor.getEmail(), newDoctor.getFullName(),
                                                oldTime, newTime, null);

                                Long newDoctorUserId = newDoctor.getUser() != null ? newDoctor.getUser().getId()
                                                : null;
                                notificationService.createForUser(newDoctorUserId,
                                                "Bạn được phân công lịch hẹn mới lúc "
                                                                + newTime.toLocalTime() + " của bệnh nhân "
                                                                + patientName,
                                                appointment.getId());
                        } else if (!oldTime.equals(newTime)) {
                                // Chỉ đổi giờ, không đổi bác sĩ → thông báo cho bác sĩ hiện tại
                                emailService.sendReassignmentNotice(newDoctor.getEmail(), newDoctor.getFullName(),
                                                oldTime, newTime, null);

                                Long doctorUserId = newDoctor.getUser() != null ? newDoctor.getUser().getId() : null;
                                notificationService.createForUser(doctorUserId,
                                                "Giờ hẹn của bệnh nhân " + patientName + " đã đổi từ "
                                                                + oldTime.toLocalTime() + " sang "
                                                                + newTime.toLocalTime(),
                                                appointment.getId());
                        }
                }
        }

        @Override
        public List<AppointmentResponse> getDailySchedule(LocalDate date) {
                LocalDateTime start = date.atStartOfDay();
                LocalDateTime end = date.plusDays(1).atStartOfDay();
                return appointmentRepository.findByAppointmentDateOrderByTimeSlotAsc(start, end)
                                .stream().map(this::toResponse).collect(Collectors.toList());
        }

        @Override
        public List<AppointmentResponse> getScheduleRange(LocalDate startDate, LocalDate endDate) {
                LocalDateTime start = startDate.atStartOfDay();
                LocalDateTime end = endDate.plusDays(1).atStartOfDay();
                return appointmentRepository.findByAppointmentDateOrderByTimeSlotAsc(start, end)
                                .stream().map(this::toResponse).collect(Collectors.toList());
        }

        private void validateDoctorCapacity(Long doctorId, LocalDate date) {
                LocalDateTime start = date.atStartOfDay();
                LocalDateTime end = date.plusDays(1).atStartOfDay();

                long count = appointmentRepository.countByDoctorIdAndAppointmentDateAndStatusIn(
                                doctorId,
                                start,
                                end,
                                List.of(
                                                AppointmentStatus.CONFIRMED,
                                                AppointmentStatus.WAITING,
                                                AppointmentStatus.IN_PROGRESS));

                if (count >= MAX_APPOINTMENTS_PER_DOCTOR_PER_DAY) {
                        throw new IllegalStateException("Bác sĩ đã đủ 30 lịch hẹn trong ngày");
                }
        }

        /**
         * Tính toán số thứ tự (queue number) tiếp theo trong ngày.
         * UC-15 (BR-13): số thứ tự duy nhất theo TỪNG BÁC SĨ + ngày — mỗi bác sĩ có
         * dải số bắt đầu từ 1 độc lập. Nếu lịch hẹn chưa gán bác sĩ (doctorId null),
         * fallback về cách tính cũ theo NGÀY-TOÀN-PHÒNG-KHÁM để không crash NPE và
         * vẫn cấp được số (trường hợp hiếm: check-in/walk-in chưa có bác sĩ).
         * DucTKH
         */
        private Integer nextQueueNumber(Long doctorId, LocalDate date) {
                LocalDateTime start = date.atStartOfDay();
                LocalDateTime end = date.plusDays(1).atStartOfDay();

                List<AppointmentStatus> statuses = List.of(
                                AppointmentStatus.WAITING,
                                AppointmentStatus.IN_PROGRESS,
                                AppointmentStatus.COMPLETED);

                Integer max;
                if (doctorId != null) {
                        // Số thứ tự lớn nhất của riêng bác sĩ này trong ngày
                        max = appointmentRepository.findMaxQueueNumberByDoctorAndDate(
                                        doctorId, start, end, statuses);
                } else {
                        // Fallback an toàn khi chưa có bác sĩ: tính theo toàn phòng khám trong ngày
                        max = appointmentRepository.findMaxQueueNumberByDate(start, end, statuses);
                }

                // Nếu chưa có số thứ tự nào, bắt đầu từ số 1 (max = null). Ngược lại tăng thêm
                // 1 đơn vị.
                return (max == null ? 0 : max) + 1;
        }

        @Override
        public List<AppointmentResponse> getMyAppointments(Long userId) {
                return appointmentRepository.findMyAppointmentsByUser(userId)
                                .stream()
                                .map(this::toResponse)
                                .collect(Collectors.toList());
        }

        @Override
        @Transactional
        public AppointmentResponse cancelAppointment(Long id, CancelAppointmentRequest request,
                        String actingUserEmail, boolean isPatientSelf) {
                Appointment appointment = appointmentRepository.findById(id)
                                .orElseThrow(() -> new ResourceNotFoundException("Lịch hẹn không tồn tại: " + id));

                if (isPatientSelf) {
                        Patient patient = patientRepository.findByEmail(actingUserEmail)
                                        .orElseThrow(() -> new ResourceNotFoundException(
                                                        "Không tìm thấy thông tin bệnh nhân"));
                        if (appointment.getPatient() == null
                                        || !appointment.getPatient().getId().equals(patient.getId())) {
                                throw new ResourceNotFoundException("Lịch hẹn không tồn tại: " + id);
                        }
                }

                if (appointment.getStatus() == AppointmentStatus.CANCELLED
                                || appointment.getStatus() == AppointmentStatus.COMPLETED) {
                        throw new IllegalStateException("Lịch hẹn đã ở trạng thái không thể huỷ");
                }

                if (isPatientSelf && appointment.getAppointmentTime().isBefore(LocalDateTime.now().plusHours(1))) {
                        throw new IllegalStateException(
                                        "Lịch hẹn chỉ có thể huỷ trước giờ khám ít nhất 1 giờ. Vui lòng liên hệ trực tiếp phòng khám.");
                }

                appointment.setStatus(AppointmentStatus.CANCELLED);
                appointment.setCancelReason(request != null ? request.getReason() : null);
                appointment.setCancelledAt(LocalDateTime.now());
                appointment.setCancelledBy(
                                userRepository.findByEmail(actingUserEmail).map(User::getId).orElse(null));

                return toResponse(appointmentRepository.save(appointment));
        }

        @Override
        @Transactional
        public AppointmentResponse reschedulePatientAppointment(Long id, RescheduleAppointmentRequest request,
                        String patientEmail) {
                Appointment appointment = appointmentRepository.findById(id)
                                .orElseThrow(() -> new ResourceNotFoundException("Lịch hẹn không tồn tại: " + id));

                Patient patient = patientRepository.findByEmail(patientEmail)
                                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy thông tin bệnh nhân"));

                if (appointment.getPatient() == null || !appointment.getPatient().getId().equals(patient.getId())) {
                        throw new ResourceNotFoundException("Lịch hẹn không tồn tại: " + id);
                }

                if (appointment.getStatus() != AppointmentStatus.PENDING
                                && appointment.getStatus() != AppointmentStatus.CONFIRMED) {
                        throw new IllegalStateException("Chỉ lịch hẹn đang chờ hoặc đã xác nhận mới được đổi giờ");
                }

                if (appointment.getAppointmentTime().isBefore(LocalDateTime.now().plusHours(1))) {
                        throw new IllegalStateException(
                                        "Lịch hẹn chỉ có thể đổi giờ trước giờ khám ít nhất 1 giờ. Vui lòng liên hệ trực tiếp phòng khám.");
                }

                LocalDateTime newTime = request.getNewAppointmentTime();
                if (newTime == null) {
                        throw new IllegalArgumentException("Thời gian khám mới không được để trống");
                }

                // BR-04: giờ khám mới cũng phải cách hiện tại tối thiểu
                // BOOKING_LEAD_TIME_MINUTES
                // (giống lúc đặt mới), tránh đổi sang giờ quá sát/đã qua.
                if (newTime.isBefore(LocalDateTime.now().plusMinutes(BOOKING_LEAD_TIME_MINUTES))) {
                        throw new IllegalArgumentException(
                                        "Vui lòng chọn giờ khám mới cách thời điểm hiện tại ít nhất "
                                                        + BOOKING_LEAD_TIME_MINUTES + " phút");
                }

                // Chặn đổi sang khung giờ đã có lịch hẹn khác của cùng bác sĩ (trừ chính lịch
                // này)
                if (appointment.getDoctor() != null
                                && !newTime.equals(appointment.getAppointmentTime())
                                && appointmentRepository.existsByDoctor_IdAndAppointmentTimeAndStatusNot(
                                                appointment.getDoctor().getId(), newTime,
                                                AppointmentStatus.CANCELLED)) {
                        throw new IllegalStateException(
                                        "Khung giờ này đã có lịch hẹn khác, vui lòng chọn khung giờ khác");
                }

                if (appointment.getDoctor() != null
                                && !newTime.toLocalDate().equals(appointment.getAppointmentDate())) {
                        validateDoctorCapacity(appointment.getDoctor().getId(), newTime.toLocalDate());
                }

                appointment.setAppointmentTime(newTime);
                appointment.setTimeSlot(newTime.toLocalTime().format(SLOT_FMT));
                appointment.setStatus(AppointmentStatus.PENDING);

                return toResponse(appointmentRepository.save(appointment));
        }

        @Override
        @Transactional
        public AppointmentResponse updateAppointmentNotes(Long id, UpdateAppointmentNotesRequest request) {
                Appointment appointment = appointmentRepository.findById(id)
                                .orElseThrow(() -> new ResourceNotFoundException("Lịch hẹn không tồn tại: " + id));

                appointment.setNotes(request != null ? request.getNotes() : null);

                return toResponse(appointmentRepository.save(appointment));
        }

        @Override
        @Transactional(readOnly = true)
        public AppointmentResponse getAppointmentById(Long id) {
                Appointment appointment = appointmentRepository.findById(id)
                                .orElseThrow(() -> new ResourceNotFoundException("Lịch hẹn không tồn tại: " + id));
                return toResponse(appointment);
        }

        @Override
        @Transactional
        public AppointmentResponse sendReminder(Long id) {
                Appointment appointment = appointmentRepository.findById(id)
                                .orElseThrow(() -> new ResourceNotFoundException("Lịch hẹn không tồn tại: " + id));

                Patient patient = appointment.getPatient();
                if (patient == null) {
                        throw new ResourceNotFoundException("Lịch hẹn không có thông tin bệnh nhân: " + id);
                }

                String patientName = patient.getFullName();

                appointment.setReminderSent(true);
                Appointment saved = appointmentRepository.save(appointment);

                // Thông báo in-app cho bệnh nhân (kiểu Facebook) — chỉ tạo nếu bệnh nhân có tài
                // khoản.
                // Bệnh nhân bấm thông báo để xem chi tiết lịch hẹn của mình.
                Long patientUserId = patient.getUser() != null ? patient.getUser().getId() : null;
                notificationService.createForUser(patientUserId,
                                "Bạn có lịch khám sắp tới. Nhấn để xem chi tiết lịch hẹn.", saved.getId());

                // Thông báo broadcast cho Lễ tân để theo dõi
                notificationService.createForReceptionists(
                                "Đã gửi nhắc lịch cho " + patientName, saved.getId());

                return toResponse(saved);
        }

        /**
         * Dừng ca khám giữa chừng:
         * 1. Validate: appointment phải đang IN_PROGRESS
         * 2. Chuyển appointment → CANCELLED
         * 3. Nếu tồn tại MedicalRecord gắn với appointment này → đưa về DRAFT
         */
        @Override
        @Transactional
        public AppointmentResponse abandonExam(Long appointmentId) {
                Appointment appointment = appointmentRepository.findById(appointmentId)
                                .orElseThrow(() -> new ResourceNotFoundException(
                                                "Không tìm thấy lịch hẹn #" + appointmentId));

                if (appointment.getStatus() != AppointmentStatus.IN_PROGRESS) {
                        throw new IllegalStateException(
                                        "Chỉ có thể dừng ca khám đang ở trạng thái IN_PROGRESS. " +
                                                        "Trạng thái hiện tại: " + appointment.getStatus());
                }

                // Chuyển appointment về CANCELLED
                appointment.setStatus(AppointmentStatus.CANCELLED);
                appointment.setCancelReason("Bác sĩ dừng khám giữa chừng");
                appointmentRepository.save(appointment);

                // Nếu đã tạo Medical Record cho appointment này → đưa về DRAFT
                medicalRecordRepository.findByAppointmentId(appointmentId).ifPresent(record -> {
                        // Chỉ revert nếu record chưa COMPLETED (tránh mất dữ liệu đã hoàn tất)
                        if (record.getStatus() != MedicalRecordStatus.COMPLETED) {
                                record.setStatus(MedicalRecordStatus.DRAFT);
                                medicalRecordRepository.save(record);
                        }
                });

                return toResponse(appointment);
        }

        @Override
        @Transactional
        public int autoCancelNoShowAppointments() {
                // Mốc cắt: 00:00 hôm nay. Mọi lịch hẹn có giờ khám trước thời điểm này
                // (thuộc các ngày đã qua) mà vẫn chưa kết thúc đều cần dọn tự động:
                // - PENDING/CONFIRMED còn treo → bệnh nhân không đến khám (no-show)
                // - WAITING/IN_PROGRESS còn treo → ca khám bị bỏ dở, không được đóng
                // (đây là lý do "đang khám" bị kẹt từ ngày hôm trước sang hôm sau).
                LocalDateTime cutoff = LocalDate.now().atStartOfDay();
                List<Appointment> noShows = appointmentRepository.findNoShowAppointments(
                                cutoff,
                                List.of(AppointmentStatus.PENDING, AppointmentStatus.CONFIRMED,
                                                AppointmentStatus.WAITING, AppointmentStatus.IN_PROGRESS));

                for (Appointment a : noShows) {
                        boolean wasInClinic = a.getStatus() == AppointmentStatus.WAITING
                                        || a.getStatus() == AppointmentStatus.IN_PROGRESS;
                        a.setStatus(AppointmentStatus.CANCELLED);
                        a.setCancelReason(wasInClinic
                                        ? "Ca khám quá hạn chưa hoàn tất (hệ thống tự động huỷ)"
                                        : "Bệnh nhân không đến khám (hệ thống tự động huỷ)");
                        a.setCancelledAt(LocalDateTime.now());
                        a.setCancelledBy(null); // huỷ tự động bởi hệ thống, không có người thực hiện
                        appointmentRepository.save(a);

                        // Thông báo in-app cho bệnh nhân (nếu có tài khoản)
                        Long patientUserId = a.getPatient() != null && a.getPatient().getUser() != null
                                        ? a.getPatient().getUser().getId()
                                        : null;
                        notificationService.createForUser(patientUserId,
                                        wasInClinic
                                                        ? "Ca khám trước đó của bạn đã được hệ thống đóng do quá hạn chưa hoàn tất."
                                                        : "Lịch hẹn của bạn đã bị huỷ tự động do không đến khám đúng hẹn.",
                                        a.getId());
                }

                return noShows.size();
        }

        private AppointmentResponse toResponse(Appointment a) {
                Patient patient = a.getPatient();

                // "Người đặt" chỉ hiển thị khi KHÁC với chính bệnh nhân (đặt hộ người thân) —
                // tránh trùng lặp vô nghĩa khi tự đặt cho mình. Resolve từ booked_by (FK thật
                // tới users), KHÔNG parse từ notes.
                String bookedByName = null;
                String bookedByPhone = null;
                if (a.getBookedBy() != null) {
                        Long patientUserId = patient != null && patient.getUser() != null
                                        ? patient.getUser().getId()
                                        : null;
                        if (patientUserId == null || !patientUserId.equals(a.getBookedBy())) {
                                User booker = userRepository.findById(a.getBookedBy()).orElse(null);
                                if (booker != null) {
                                        bookedByName = booker.getFullName();
                                        bookedByPhone = booker.getPhone();
                                }
                        }
                }

                return AppointmentResponse.builder()
                                .id(a.getId())
                                .patientId(patient != null ? patient.getId() : null)
                                .patientName(patient != null ? patient.getFullName() : null)
                                .patientPhone(patient != null ? patient.getPhone() : null)
                                .patientGender(patient != null ? patient.getGender() : null)
                                .patientDob(patient != null ? patient.getDateOfBirth() : null)
                                .patientEmail(patient != null ? patient.getEmail() : null)
                                .patientAddress(patient != null ? patient.getAddress() : null)
                                .doctorId(a.getDoctor() != null ? a.getDoctor().getId() : null)
                                .doctorName(a.getDoctor() != null ? a.getDoctor().getFullName() : null)
                                .serviceId(a.getClinicService() != null ? a.getClinicService().getId() : null)
                                .serviceName(a.getClinicService() != null ? a.getClinicService().getServiceName()
                                                : null)
                                .servicePrice(a.getClinicService() != null ? a.getClinicService().getPrice() : null)
                                .appointmentTime(a.getAppointmentTime())
                                .timeSlot(a.getTimeSlot())
                                .status(a.getStatus())
                                .type(a.getType())
                                .queueNumber(a.getQueueNumber())
                                .checkInTime(a.getCheckInTime())
                                .notes(a.getNotes())
                                .cancelReason(a.getCancelReason())
                                .cancelledAt(a.getCancelledAt())
                                .createdAt(a.getCreatedAt())
                                .bookedByName(bookedByName)
                                .bookedByPhone(bookedByPhone)
                                .build();
        }
}
