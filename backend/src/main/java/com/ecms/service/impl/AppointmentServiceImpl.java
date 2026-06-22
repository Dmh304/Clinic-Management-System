package com.ecms.service.impl;

import com.ecms.dto.request.BookAppointmentRequest;
import com.ecms.dto.request.ReassignAppointmentRequest;
import com.ecms.dto.request.WalkInAppointmentRequest;
import com.ecms.dto.response.AppointmentDashboardResponse;
import com.ecms.dto.response.AppointmentResponse;
import com.ecms.entity.*;
import com.ecms.exception.ResourceNotFoundException;
import com.ecms.repository.AppointmentRepository;
import com.ecms.repository.ClinicServiceRepository;
import com.ecms.repository.DoctorRepository;
import com.ecms.repository.PatientRepository;
import com.ecms.service.AppointmentService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class AppointmentServiceImpl implements AppointmentService {

        private static final int MAX_APPOINTMENTS_PER_DOCTOR_PER_DAY = 30;

        private final AppointmentRepository appointmentRepository;
        private final DoctorRepository doctorRepository;
        private final PatientRepository patientRepository;
        private final ClinicServiceRepository clinicServiceRepository;

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
                Appointment appointment = appointmentRepository.findById(id)
                                .orElseThrow(() -> new ResourceNotFoundException("Lịch hẹn không tồn tại: " + id));

                if (appointment.getStatus() != AppointmentStatus.PENDING) {
                        throw new IllegalStateException("Chỉ lịch hẹn PENDING mới được xác nhận");
                }

                if (doctorId != null) {
                        Doctor doctor = doctorRepository.findById(doctorId)
                                        .orElseThrow(() -> new ResourceNotFoundException(
                                                        "Bác sĩ không tồn tại: " + doctorId));

                        validateDoctorCapacity(doctorId, appointment.getAppointmentDate());
                        appointment.setDoctor(doctor);
                }

                appointment.setStatus(AppointmentStatus.CONFIRMED);

                return toResponse(appointmentRepository.save(appointment));
        }

        @Override
        @Transactional
        public AppointmentResponse checkInAppointment(Long id) {
                Appointment appointment = appointmentRepository.findById(id)
                                .orElseThrow(() -> new ResourceNotFoundException("Lịch hẹn không tồn tại: " + id));

                if (appointment.getStatus() != AppointmentStatus.CONFIRMED) {
                        throw new IllegalStateException("Chỉ lịch hẹn CONFIRMED mới được check-in");
                }

                LocalDate appointmentDate = appointment.getAppointmentDate();
                appointment.setStatus(AppointmentStatus.WAITING);
                appointment.setCheckInTime(LocalDateTime.now());

                if (appointment.getQueueNumber() == null) {
                        appointment.setQueueNumber(nextQueueNumber(appointmentDate));
                }

                return toResponse(appointmentRepository.save(appointment));
        }

        @Override
        @Transactional
        public AppointmentResponse bookOnlineAppointment(BookAppointmentRequest request, String patientEmail) {
                Patient patient = patientRepository.findByUser_Email(patientEmail)
                                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy thông tin bệnh nhân"));

                Doctor doctor = doctorRepository.findById(request.getDoctorId())
                                .orElseThrow(() -> new ResourceNotFoundException(
                                                "Bác sĩ không tồn tại: " + request.getDoctorId()));

                validateDoctorCapacity(doctor.getId(), request.getAppointmentTime().toLocalDate());

                Appointment appointment = Appointment.builder()
                                .patient(patient)
                                .doctor(doctor)
                                .appointmentTime(request.getAppointmentTime())
                                .timeSlot(request.getAppointmentTime().toLocalTime().toString())
                                .status(AppointmentStatus.PENDING)
                                .type("ONLINE")
                                .reminderSent(false)
                                .notes(request.getNotes())
                                .build();

                return toResponse(appointmentRepository.save(appointment));
        }

        @Override
        @Transactional
        public AppointmentResponse createWalkInAppointment(WalkInAppointmentRequest request) {
                Patient patient = patientRepository.findById(request.getPatientId())
                                .orElseThrow(() -> new ResourceNotFoundException(
                                                "Bệnh nhân không tồn tại: " + request.getPatientId()));

                if (request.getAppointmentTime().isBefore(LocalDateTime.now())) {
                        throw new IllegalArgumentException("Không thể tạo lịch khám trong quá khứ");
                }

                Doctor doctor = doctorRepository.findById(request.getDoctorId())
                                .orElseThrow(() -> new ResourceNotFoundException(
                                                "Bác sĩ không tồn tại: " + request.getDoctorId()));

                validateDoctorCapacity(request.getDoctorId(), request.getAppointmentTime().toLocalDate());

                ClinicService clinicService = null;
                if (request.getServiceId() != null) {
                        clinicService = clinicServiceRepository.findById(request.getServiceId())
                                        .orElseThrow(
                                                        () -> new ResourceNotFoundException("Dịch vụ không tồn tại: "
                                                                        + request.getServiceId()));
                }

                LocalDate appointmentDate = request.getAppointmentTime().toLocalDate();

                Appointment appointment = Appointment.builder()
                                .patient(patient)
                                .doctor(doctor)
                                .clinicService(clinicService)
                                .appointmentTime(request.getAppointmentTime())
                                .timeSlot(request.getAppointmentTime().toLocalTime().toString())
                                .status(AppointmentStatus.WAITING)
                                .type("WALK_IN")
                                .queueNumber(nextQueueNumber(appointmentDate))
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

                if (request.getDoctorId() != null) {
                        Doctor doctor = doctorRepository.findById(request.getDoctorId())
                                        .orElseThrow(() -> new ResourceNotFoundException(
                                                        "Bác sĩ không tồn tại: " + request.getDoctorId()));
                        appointment.setDoctor(doctor);
                }

                if (request.getNewAppointmentTime() != null) {
                        appointment.setAppointmentTime(request.getNewAppointmentTime());
                        appointment.setTimeSlot(request.getNewAppointmentTime().toLocalTime().toString());
                }

                if (request.getReason() != null) {
                        appointment.setNotes(request.getReason());
                }

                return toResponse(appointmentRepository.save(appointment));
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
         * Tính toán số thứ tự (queue number) tiếp theo cho bệnh nhân trong ngày.
         * Mỗi bệnh nhân tiếp nhận thành công được cấp số thứ tự tăng dần.
         * DucTKH
         */
        private Integer nextQueueNumber(LocalDate date) {
                LocalDateTime start = date.atStartOfDay();
                LocalDateTime end = date.plusDays(1).atStartOfDay();

                // Tìm số thứ tự lớn nhất hiện tại của ngày đó trong các trạng thái đang khám,
                // chờ khám hoặc hoàn thành
                Integer max = appointmentRepository.findMaxQueueNumberByDate(
                                start,
                                end,
                                List.of(
                                                AppointmentStatus.WAITING,
                                                AppointmentStatus.IN_PROGRESS,
                                                AppointmentStatus.COMPLETED));

                // Nếu chưa có số thứ tự nào, bắt đầu từ số 1 (max = null). Ngược lại tăng thêm
                // 1 đơn vị.
                return (max == null ? 0 : max) + 1;
        }

        @Override
        public List<AppointmentResponse> getMyAppointments(Long patientId) {
                return appointmentRepository.findAllWithDetailsAndPatientId(patientId)
                                .stream()
                                .map(this::toResponse)
                                .collect(Collectors.toList());
        }

        private AppointmentResponse toResponse(Appointment a) {
                return AppointmentResponse.builder()
                                .id(a.getId())
                                .patientId(a.getPatient() != null ? a.getPatient().getId() : null)
                                .patientName(a.getPatient() != null ? a.getPatient().getFullName() : null)
                                .patientPhone(a.getPatient() != null ? a.getPatient().getPhone() : null)
                                .doctorId(a.getDoctor() != null ? a.getDoctor().getId() : null)
                                .doctorName(a.getDoctor() != null ? a.getDoctor().getFullName() : null)
                                .serviceName(a.getClinicService() != null ? a.getClinicService().getServiceName()
                                                : null)
                                .appointmentTime(a.getAppointmentTime())
                                .timeSlot(a.getTimeSlot())
                                .status(a.getStatus())
                                .type(a.getType())
                                .queueNumber(a.getQueueNumber())
                                .checkInTime(a.getCheckInTime())
                                .notes(a.getNotes())
                                .createdAt(a.getCreatedAt())
                                .build();
        }
}