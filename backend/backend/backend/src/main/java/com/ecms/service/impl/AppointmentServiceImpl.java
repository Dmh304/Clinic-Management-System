package com.ecms.service.impl;

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
import java.util.ArrayList;
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
                .pending(appointmentRepository.countByDateAndStatus(start, end, AppointmentStatus.PENDING))
                .confirmed(appointmentRepository.countByDateAndStatus(start, end, AppointmentStatus.CONFIRMED))
                .waiting(appointmentRepository.countByDateAndStatus(start, end, AppointmentStatus.WAITING))
                .inProgress(appointmentRepository.countByDateAndStatus(start, end, AppointmentStatus.IN_PROGRESS))
                .completed(appointmentRepository.countByDateAndStatus(start, end, AppointmentStatus.COMPLETED))
                .cancelled(appointmentRepository.countByDateAndStatus(start, end, AppointmentStatus.CANCELLED))
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
                    .orElseThrow(() -> new ResourceNotFoundException("Bác sĩ không tồn tại: " + doctorId));

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
    public AppointmentResponse createWalkInAppointment(WalkInAppointmentRequest request) {
        Patient patient = patientRepository.findById(request.getPatientId())
                .orElseThrow(() -> new ResourceNotFoundException("Bệnh nhân không tồn tại: " + request.getPatientId()));

        Doctor doctor = null;
        if (request.getDoctorId() != null) {
            doctor = doctorRepository.findById(request.getDoctorId())
                    .orElseThrow(() -> new ResourceNotFoundException("Bác sĩ không tồn tại: " + request.getDoctorId()));
            validateDoctorCapacity(request.getDoctorId(), request.getAppointmentTime().toLocalDate());
        }

        ClinicService clinicService = null;
        if (request.getServiceId() != null) {
            clinicService = clinicServiceRepository.findById(request.getServiceId())
                    .orElseThrow(
                            () -> new ResourceNotFoundException("Dịch vụ không tồn tại: " + request.getServiceId()));
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

    private Integer nextQueueNumber(LocalDate date) {
        LocalDateTime start = date.atStartOfDay();
        LocalDateTime end = date.plusDays(1).atStartOfDay();

        Integer max = appointmentRepository.findMaxQueueNumberByDate(
                start,
                end,
                List.of(
                        AppointmentStatus.WAITING,
                        AppointmentStatus.IN_PROGRESS,
                        AppointmentStatus.COMPLETED));

        return (max == null ? 0 : max) + 1;
    }

    private AppointmentResponse toResponse(Appointment a) {
        return AppointmentResponse.builder()
                .id(a.getId())
                .patientId(a.getPatient() != null ? a.getPatient().getId() : null)
                .patientName(a.getPatient() != null ? a.getPatient().getFullName() : null)
                .patientPhone(a.getPatient() != null ? a.getPatient().getPhone() : null)
                .doctorId(a.getDoctor() != null ? a.getDoctor().getId() : null)
                .doctorName(a.getDoctor() != null ? a.getDoctor().getFullName() : null)
                .serviceName(a.getClinicService() != null ? a.getClinicService().getServiceName() : null)
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

    @Override
    public List<AppointmentResponse> getTodayQueue(Long doctorId) {

        /** Thiết lập khoảng thời gian từ 00:00:00 đến 23:59:59 của ngày hôm nay */
        LocalDateTime startOfDay = LocalDate.now().atStartOfDay();
        LocalDateTime endOfDay = LocalDate.now().atTime(23, 59, 59);

        /** Định nghĩa trạng thái cần lọc (Chỉ lấy những người đang đợi khám) */
        // String statusWaiting = "PENDING";
        AppointmentStatus statusWaiting = AppointmentStatus.PENDING;

        /** Gọi tầng Repository để lấy dữ liệu thực thể gốc dưới Database lên */
        List<Appointment> appointments = appointmentRepository
                .findByDoctorIdAndStatusAndAppointmentTimeBetweenOrderByCheckInTimeAsc(doctorId, statusWaiting,
                        startOfDay, endOfDay);

        /** Tạo một danh sách rỗng để chứa các DTO kết quả */
        List<AppointmentResponse> queue = new ArrayList<>();

        /** Sử dụng vòng lặp truyền thống để chuyển đổi từng đối tượng Entity -> DTO */
        for (Appointment app : appointments) {
            AppointmentResponse response = new AppointmentResponse();

            /** Map các thông tin cơ bản từ Appointment sang DTO */
            response.setId(app.getId());
            response.setPatientId(app.getPatient().getId());
            response.setPatientName(app.getPatient().getFullName());
            response.setPatientPhone(app.getPatient().getPhone());
            response.setDoctorId(app.getDoctor().getId());
            response.setDoctorName(app.getDoctor().getFullName());
            response.setServiceName(app.getClinicService().getServiceName());
            response.setAppointmentTime(app.getAppointmentTime());
            response.setTimeSlot(app.getTimeSlot());
            response.setStatus(app.getStatus());
            response.setType(app.getType());
            response.setQueueNumber(app.getQueueNumber());
            response.setCheckInTime(app.getCheckInTime());
            response.setNotes(app.getNotes());
            response.setCreatedAt(app.getCreatedAt());

            /** Thêm DTO đã xử lý xong vào danh sách trả về */
            queue.add(response);
        }

        /** Trả danh sách sạch sẽ về cho Controller */
        return queue;
    }
}