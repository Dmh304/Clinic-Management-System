/**
 * Author: DucTKH, TuanTD
 * 
 * Lớp triển khai các dịch vụ quản lý lịch hẹn
 * Cung cấp các chức năng: Đặt lịch online, đăng ký khám vãng lai (Walk-in),
 * Check-in, xác nhận, điều chuyển bác sĩ và thống kê dashboard.
 */

package com.ecms.service.impl;

import com.ecms.dto.request.BookAppointmentRequest;
import com.ecms.dto.request.CancelAppointmentRequest;
import com.ecms.dto.request.ReassignAppointmentRequest;
import com.ecms.dto.request.RescheduleAppointmentRequest;
import com.ecms.dto.request.UpdateAppointmentNotesRequest;
import com.ecms.dto.request.WalkInAppointmentRequest;
import com.ecms.dto.response.AppointmentDashboardResponse;
import com.ecms.dto.response.AppointmentResponse;
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
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class AppointmentServiceImpl implements AppointmentService {

        // Giới hạn số lượng lịch hẹn tối đa mà một bác sĩ có thể tiếp nhận trong một
        // ngày
        private static final int MAX_APPOINTMENTS_PER_DOCTOR_PER_DAY = 30;

        // Tiêm các tầng dữ liệu (Repositories) thông qua Constructor Injection của
        // Lombok (@RequiredArgsConstructor)
        private final AppointmentRepository appointmentRepository;
        private final DoctorRepository doctorRepository;
        private final PatientRepository patientRepository;
        private final ClinicServiceRepository clinicServiceRepository;
        private final UserRepository userRepository;
        private final NotificationService notificationService;
        private final EmailService emailService;
        private final MedicalRecordRepository medicalRecordRepository;

        /* Lấy danh sách toàn bộ lịch hẹn trong ngày hôm nay */
        @Override
        @Transactional(readOnly = true)
        public List<AppointmentResponse> getTodayAppointments() {
                LocalDate today = LocalDate.now();
                // Khởi tạo mốc thời gian từ 00:00:00 hôm nay đến 00:00:00 ngày hôm sau
                LocalDateTime start = today.atStartOfDay();
                LocalDateTime end = today.plusDays(1).atStartOfDay();

                return appointmentRepository
                                .findByAppointmentDateOrderByTimeSlotAsc(start, end)
                                .stream()
                                .map(this::toResponse)
                                .collect(Collectors.toList());
        }

        /*
         * Lấy danh sách tất cả các lịch hẹn có trong hệ thống (bao gồm thông tin chi
         * tiết)
         */
        @Override
        public List<AppointmentResponse> getAllAppointments() {
                return appointmentRepository.findAllWithDetails()
                                .stream()
                                .map(this::toResponse)
                                .collect(Collectors.toList());
        }

        /*
         * Tìm kiếm lịch hẹn dựa theo từ khóa (Tên bệnh nhân, số điện thoại, mã lịch
         * hẹn,...)
         */
        @Override
        public List<AppointmentResponse> searchAppointments(String keyword) {
                // Kiểm tra nếu từ khóa null hoặc chỉ chứa khoảng trắng
                if (keyword == null || keyword.trim().isEmpty()) {
                        return getAllAppointments();
                }

                return appointmentRepository.searchAppointments(keyword.trim())
                                .stream()
                                .map(this::toResponse)
                                .collect(Collectors.toList());
        }

        /*
         * Lấy danh sách hàng đợi (Queue) của các bác sĩ nói chung trong một ngày cụ thể
         */
        @Override
        public List<AppointmentResponse> getDoctorQueue(LocalDate date) {
                // Nếu ngày truyền vào trống, mặc định lấy ngày hiện tại
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

        /*
         * Lấy dữ liệu thống kê tổng hợp (Dashboard) về số lượng lịch hẹn của toàn phòng
         * khám theo ngày
         */
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

        /*
         * Lấy danh sách lịch hẹn của một bác sĩ cụ thể trong ngày, sắp xếp theo thời
         * gian khám tăng dần
         */
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

        /*
         * Lấy dữ liệu thống kê số lượng lịch hẹn (Dashboard) riêng cho một bác sĩ cụ
         * thể theo ngày
         */
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

        /* Cập nhật trạng thái trực tiếp cho một lịch hẹn */
        @Override
        @Transactional
        public AppointmentResponse updateAppointmentStatus(Long id, AppointmentStatus status) {
                Appointment appointment = appointmentRepository.findById(id)
                                .orElseThrow(() -> new ResourceNotFoundException("Lịch hẹn không tồn tại: " + id));

                appointment.setStatus(status);

                return toResponse(appointmentRepository.save(appointment));
        }

        /*
         * Xác nhận lịch hẹn đăng ký trực tuyến (Xác nhận trạng thái từ PENDING lên
         * CONFIRMED)
         */
        @Override
        @Transactional
        public AppointmentResponse confirmAppointment(Long id, Long doctorId) {
                // Kiểm tra sự tồn tại của lịch hẹn
                Appointment appointment = appointmentRepository.findById(id)
                                .orElseThrow(() -> new ResourceNotFoundException("Lịch hẹn không tồn tại: " + id));

                // Ràng buộc nghiệp vụ: Chỉ cho phép xác nhận lịch hẹn đang ở trạng thái PENDING
                if (appointment.getStatus() != AppointmentStatus.PENDING) {
                        throw new IllegalStateException("Chỉ lịch hẹn PENDING mới được xác nhận");
                }

                // Nếu có chỉ định bác sĩ khám, tiến hành kiểm tra thông tin và hiệu suất của
                // bác sĩ
                if (doctorId != null) {
                        Doctor doctor = doctorRepository.findById(doctorId)
                                        .orElseThrow(() -> new ResourceNotFoundException(
                                                        "Bác sĩ không tồn tại: " + doctorId));

                        // Kiểm tra xem bác sĩ này đã đạt giới hạn tối đa số ca khám trong ngày chưa
                        validateDoctorCapacity(doctorId, appointment.getAppointmentDate());
                        appointment.setDoctor(doctor);
                }

                // Chuyển trạng thái lịch hẹn sang CONFIRMED
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

        /* Thực hiện thủ tục Check-in cho bệnh nhân khi họ đến phòng khám trực tiếp */
        @Override
        @Transactional
        public AppointmentResponse checkInAppointment(Long id, Long checkInByUserId) {
                Appointment appointment = appointmentRepository.findById(id)
                                .orElseThrow(() -> new ResourceNotFoundException("Lịch hẹn không tồn tại: " + id));

                // Ràng buộc nghiệp vụ: Bệnh nhân bắt buộc phải có lịch đã được CONFIRMED trước
                // đó mới được check-in
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

                // Cấp số thứ tự khám tự động tăng trong ngày nếu lịch này chưa được cấp số
                if (appointment.getQueueNumber() == null) {
                        Long doctorId = appointment.getDoctor() != null ? appointment.getDoctor().getId() : null;
                        appointment.setQueueNumber(nextQueueNumber(doctorId, appointmentDate));
                }

                return toResponse(appointmentRepository.save(appointment));
        }

        /* Đặt lịch hẹn khám bệnh Trực tuyến */
        @Override
        @Transactional
        public AppointmentResponse bookOnlineAppointment(BookAppointmentRequest request, String patientEmail) {
                // Tìm thông tin bệnh nhân dựa vào Email tài khoản đang đăng nhập
                Patient patient = patientRepository.findByUser_Email(patientEmail)
                                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy thông tin bệnh nhân"));

                // Kiểm tra thông tin bác sĩ yêu cầu
                Doctor doctor = doctorRepository.findById(request.getDoctorId())
                                .orElseThrow(() -> new ResourceNotFoundException(
                                                "Bác sĩ không tồn tại: " + request.getDoctorId()));

                ClinicService service = null;
                if (request.getServiceId() != null) {
                        service = clinicServiceRepository.findById(request.getServiceId())
                                        .orElseThrow(() -> new ResourceNotFoundException(
                                                        "Dịch vụ không tồn tại: " + request.getServiceId()));
                }

                validateDoctorCapacity(doctor.getId(), request.getAppointmentTime().toLocalDate());

                // UC-46: gắn dịch vụ khám nếu bệnh nhân chọn từ trang Dịch vụ khám mắt
                ClinicService clinicService = null;
                if (request.getServiceId() != null) {
                        clinicService = clinicServiceRepository.findById(request.getServiceId())
                                        .orElseThrow(
                                                        () -> new ResourceNotFoundException("Dịch vụ không tồn tại: "
                                                                        + request.getServiceId()));
                }

                Appointment appointment = Appointment.builder()
                                .patient(patient)
                                .doctor(doctor)
                                .clinicService(clinicService)
                                .appointmentTime(request.getAppointmentTime())
                                .timeSlot(request.getAppointmentTime().toLocalTime().toString())
                                .status(AppointmentStatus.PENDING) // Đợi duyệt
                                .type("ONLINE")
                                .reminderSent(false) // Mặc định chưa gửi nhắc lịch
                                .notes(request.getNotes())
                                .build();

                return toResponse(appointmentRepository.save(appointment));
        }

        /* Tiếp nhận và tạo lịch khám trực tiếp tại quầy lễ tân (Walk-in Appointment) */
        @Override
        @Transactional
        public AppointmentResponse createWalkInAppointment(WalkInAppointmentRequest request) {
                // Xác thực thông tin bệnh nhân
                Patient patient = patientRepository.findById(request.getPatientId())
                                .orElseThrow(() -> new ResourceNotFoundException(
                                                "Bệnh nhân không tồn tại: " + request.getPatientId()));

                // Nghiệp vụ logic: Không cho phép chọn thời gian khám nằm trong quá khứ
                if (request.getAppointmentTime().isBefore(LocalDateTime.now())) {
                        throw new IllegalArgumentException("Không thể tạo lịch khám trong quá khứ");
                }

                // Xác thực thông tin bác sĩ tiếp nhận ca khám
                Doctor doctor = doctorRepository.findById(request.getDoctorId())
                                .orElseThrow(() -> new ResourceNotFoundException(
                                                "Bác sĩ không tồn tại: " + request.getDoctorId()));

                // Kiểm tra tải năng suất của bác sĩ
                validateDoctorCapacity(request.getDoctorId(), request.getAppointmentTime().toLocalDate());

                // Xác thực dịch vụ y tế đi kèm nếu có (Ví dụ: Khám nội, khám nhi, nội soi,...)
                ClinicService clinicService = null;
                if (request.getServiceId() != null) {
                        clinicService = clinicServiceRepository.findById(request.getServiceId())
                                        .orElseThrow(
                                                        () -> new ResourceNotFoundException("Dịch vụ không tồn tại: "
                                                                        + request.getServiceId()));
                }

                LocalDate appointmentDate = request.getAppointmentTime().toLocalDate();

                // Khởi tạo lịch hẹn dạng xếp hàng trực tiếp (WALK_IN)
                Appointment appointment = Appointment.builder()
                                .patient(patient)
                                .doctor(doctor)
                                .clinicService(clinicService)
                                .appointmentTime(request.getAppointmentTime())
                                .timeSlot(request.getAppointmentTime().toLocalTime().toString())
                                .status(AppointmentStatus.WAITING) // Vào thẳng hàng đợi chờ khám
                                .type("WALK_IN")
                                .queueNumber(nextQueueNumber(request.getDoctorId(), appointmentDate))
                                .checkInTime(LocalDateTime.now())
                                .reminderSent(false)
                                .notes(request.getNotes())
                                .build();

                return toResponse(appointmentRepository.save(appointment));
        }

        /*
         * Điều chuyển lịch hẹn (Đổi bác sĩ điều trị, dời lịch sang khung giờ mới hoặc
         * cập nhật lý do thay đổi)
         */
        @Override
        @Transactional
        public AppointmentResponse reassignAppointment(Long id, ReassignAppointmentRequest request) {
                // Kiểm tra sự tồn tại của lịch hẹn cần điều chuyển
                Appointment appointment = appointmentRepository.findById(id)
                                .orElseThrow(() -> new ResourceNotFoundException("Lịch hẹn không tồn tại: " + id));

                // Lịch hẹn đã kết thúc thành công hoặc đã bị hủy từ trước thì không được phép
                // chỉnh sửa
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

                // Cập nhật mốc thời gian khám mới nếu có yêu cầu dời lịch
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

        /*
         * Xem lịch trình làm việc cụ thể của toàn phòng khám trong 1 ngày (Daily
         * Schedule)
         */
        @Override
        public List<AppointmentResponse> getDailySchedule(LocalDate date) {
                LocalDateTime start = date.atStartOfDay();
                LocalDateTime end = date.plusDays(1).atStartOfDay();
                return appointmentRepository.findByAppointmentDateOrderByTimeSlotAsc(start, end)
                                .stream().map(this::toResponse).collect(Collectors.toList());
        }

        /*
         * Xem lịch trình làm việc mở rộng của phòng khám trong một khoảng thời gian (Từ
         * ngày... Đến ngày...)
         */
        @Override
        public List<AppointmentResponse> getScheduleRange(LocalDate startDate, LocalDate endDate) {
                LocalDateTime start = startDate.atStartOfDay();
                LocalDateTime end = endDate.plusDays(1).atStartOfDay(); // Đảm bảo lấy hết dữ liệu đến cuối ngày kết
                                                                        // thúc
                return appointmentRepository.findByAppointmentDateOrderByTimeSlotAsc(start, end)
                                .stream().map(this::toResponse).collect(Collectors.toList());
        }

        /*
         * Phương thức nội bộ (Helper): Kiểm tra giới hạn số lượng đặt lịch của bác sĩ
         */
        private void validateDoctorCapacity(Long doctorId, LocalDate date) {
                LocalDateTime start = date.atStartOfDay();
                LocalDateTime end = date.plusDays(1).atStartOfDay();

                // Đếm tổng số lịch hẹn của bác sĩ đã được xác nhận, đang đợi hoặc đang khám
                // trong ngày
                long count = appointmentRepository.countByDoctorIdAndAppointmentDateAndStatusIn(
                                doctorId,
                                start,
                                end,
                                List.of(
                                                AppointmentStatus.CONFIRMED,
                                                AppointmentStatus.WAITING,
                                                AppointmentStatus.IN_PROGRESS));

                // Nếu số lượng vượt ngưỡng cấu hình, chặn và ném lỗi hệ thống
                if (count >= MAX_APPOINTMENTS_PER_DOCTOR_PER_DAY) {
                        throw new IllegalStateException(
                                        "Bác sĩ đã đủ " + MAX_APPOINTMENTS_PER_DOCTOR_PER_DAY + " lịch hẹn trong ngày");
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

                // Nếu đầu ngày chưa có số thứ tự nào, bắt đầu cấp từ số 1 (ứng với max = null)
                // Ngược lại, lấy số lớn nhất hiện tại tăng thêm 1 đơn vị
                return (max == null ? 0 : max) + 1;
        }

        /*
         * Lấy danh sách toàn bộ lịch sử lịch hẹn của riêng một bệnh nhân (Dành cho chức
         * năng lịch sử khám cá nhân)
         */
        @Override
        public List<AppointmentResponse> getMyAppointments(Long patientId) {
                return appointmentRepository.findAllWithDetailsAndPatientId(patientId)
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

                if (appointment.getDoctor() != null
                                && !newTime.toLocalDate().equals(appointment.getAppointmentDate())) {
                        validateDoctorCapacity(appointment.getDoctor().getId(), newTime.toLocalDate());
                }

                appointment.setAppointmentTime(newTime);
                appointment.setTimeSlot(newTime.toLocalTime().toString());
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

        private AppointmentResponse toResponse(Appointment a) {
                return AppointmentResponse.builder()
                                .id(a.getId())
                                // Kiểm tra liên kết Bệnh nhân để lấy ID, họ tên và số điện thoại
                                .patientId(a.getPatient() != null ? a.getPatient().getId() : null)
                                .patientName(a.getPatient() != null ? a.getPatient().getFullName() : null)
                                .patientPhone(a.getPatient() != null ? a.getPatient().getPhone() : null)
                                // Kiểm tra liên kết Bác sĩ để lấy ID và họ tên bác sĩ phụ trách
                                .doctorId(a.getDoctor() != null ? a.getDoctor().getId() : null)
                                .doctorName(a.getDoctor() != null ? a.getDoctor().getFullName() : null)
                                .serviceId(a.getClinicService() != null ? a.getClinicService().getId() : null)
                                .serviceName(a.getClinicService() != null ? a.getClinicService().getServiceName()
                                                : null)
                                .serviceName(a.getClinicService() != null ? a.getClinicService().getServiceName()
                                                : null)
                                .servicePrice(a.getClinicService() != null ? a.getClinicService().getPrice() : null)
                                .appointmentTime(a.getAppointmentTime())
                                .timeSlot(a.getTimeSlot())
                                .status(a.getStatus())
                                .type(a.getType()) // "ONLINE" hoặc "WALK_IN"
                                .queueNumber(a.getQueueNumber()) // Số thứ tự phòng khám
                                .checkInTime(a.getCheckInTime()) // Giờ check-in thực tế
                                .notes(a.getNotes())
                                .createdAt(a.getCreatedAt())
                                .build();
        }
}