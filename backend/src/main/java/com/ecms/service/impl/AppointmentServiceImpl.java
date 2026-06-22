/** 
 * Author: Tuấn - HE204215
 * 
 * Triển khai chi tiết các nghiệp vụ liên quan đến Lịch hẹn và Hàng đợi bệnh nhân,
 * bao gồm các quy tắc như giới hạn số ca khám mỗi ngày, xử lý chuyển trạng thái lịch hẹn, check-in.
*/
package com.ecms.service.impl;

import com.ecms.dto.request.BookAppointmentRequest;
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

/**
 * Lớp triển khai các dịch vụ nghiệp vụ liên quan đến Lịch hẹn (Appointments).
 * Xử lý kiểm tra giới hạn lịch hẹn của bác sĩ, quản lý hàng đợi và gán số thứ
 * tự tiếp nhận bệnh nhân.
 * DucTKH
 */
@Service
@RequiredArgsConstructor
public class AppointmentServiceImpl implements AppointmentService {

        // Giới hạn số lượng lịch khám tối đa của 1 bác sĩ trong 1 ngày
        private static final int MAX_APPOINTMENTS_PER_DOCTOR_PER_DAY = 30;

        // các repository phụ trách thao tác dữ liệu với cơ sở dữ liệu
        private final AppointmentRepository appointmentRepository;
        private final DoctorRepository doctorRepository;
        private final PatientRepository patientRepository;
        private final ClinicServiceRepository clinicServiceRepository;

        /* Lấy danh sách toàn bộ lịch khám trong ngày hôm nay */
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

        /**
         * Tìm kiếm lịch hẹn để hỗ trợ check-in bệnh nhân.
         * Receptionist có thể nhập tên, số điện thoại hoặc mã bệnh nhân/lịch hẹn để tìm
         * nhanh đúng lịch cần check-in.
         * DucTKH
         */
        @Override
        public List<AppointmentResponse> searchAppointments(String keyword) {
                // Kiểm tra điều kiện: Nếu từ khóa trống, trả về toàn bộ lịch hẹn trong hệ thống
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

        /* Lấy danh sách khám riêng biệt của 1 bác sĩ trong ngày */
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

        /* Tổng hợp số liệu thống kê riêng cho 1 bác sĩ cụ thể trong ngày */
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

        /* Cập nhật trạng thái trực tiếp cho 1 lịch khám */
        @Override
        @Transactional
        public AppointmentResponse updateAppointmentStatus(Long id, AppointmentStatus status) {
                Appointment appointment = appointmentRepository.findById(id)
                                .orElseThrow(() -> new ResourceNotFoundException("Lịch hẹn không tồn tại: " + id));

                appointment.setStatus(status);

                return toResponse(appointmentRepository.save(appointment));
        }

        /**
         * Xác nhận lịch hẹn trực tuyến và phân công bác sĩ điều trị.
         * Kiểm tra sức chứa/giới hạn bệnh nhân tối đa trong ngày của bác sĩ (tối đa 30
         * ca).
         * DucTKH
         */
        @Override
        @Transactional
        public AppointmentResponse confirmAppointment(Long id, Long doctorId) {
                Appointment appointment = appointmentRepository.findById(id)
                                .orElseThrow(() -> new ResourceNotFoundException("Lịch hẹn không tồn tại: " + id));

                // Kiểm tra chỉ lịch hẹn ở trạng thái PENDING mới được phép xác nhận
                if (appointment.getStatus() != AppointmentStatus.PENDING) {
                        throw new IllegalStateException("Chỉ lịch hẹn PENDING mới được xác nhận");
                }

                // Kiểm tra xem lễ tân có chọn/gán bác sĩ khám hay không
                if (doctorId != null) {
                        Doctor doctor = doctorRepository.findById(doctorId)
                                        .orElseThrow(() -> new ResourceNotFoundException(
                                                        "Bác sĩ không tồn tại: " + doctorId));

                        // Kiểm tra giới hạn tối đa 30 lịch hẹn của bác sĩ trong ngày (BR-03)
                        validateDoctorCapacity(doctorId, appointment.getAppointmentDate());
                        appointment.setDoctor(doctor);
                }

                appointment.setStatus(AppointmentStatus.CONFIRMED);

                return toResponse(appointmentRepository.save(appointment));
        }

        /**
         * Thực hiện check-in tiếp nhận bệnh nhân đã có lịch hẹn đã xác nhận vào phòng
         * chờ khám.
         * Hệ thống sẽ gán tự động số thứ tự hàng đợi (queue number) tăng dần trong
         * ngày.
         * DucTKH
         */
        @Override
        @Transactional
        public AppointmentResponse checkInAppointment(Long id) {
                Appointment appointment = appointmentRepository.findById(id)
                                .orElseThrow(() -> new ResourceNotFoundException("Lịch hẹn không tồn tại: " + id));

                // Bệnh nhân chỉ được check-in tiếp nhận nếu lịch hẹn đã CONFIRM
                if (appointment.getStatus() != AppointmentStatus.CONFIRMED) {
                        throw new IllegalStateException("Chỉ lịch hẹn CONFIRMED mới được check-in");
                }

                LocalDate appointmentDate = appointment.getAppointmentDate();
                appointment.setStatus(AppointmentStatus.WAITING);
                appointment.setCheckInTime(LocalDateTime.now());
                // Kiểm tra xem lịch hẹn đã có số thứ tự chưa, nếu chưa có thì tiến hành cấp mới
                if (appointment.getQueueNumber() == null) {
                        appointment.setQueueNumber(nextQueueNumber(appointmentDate));
                }

                return toResponse(appointmentRepository.save(appointment));
        }

        // @Override
        // @Transactional
        // public AppointmentResponse bookOnlineAppointment(BookAppointmentRequest
        // request, String patientEmail) {
        // Patient patient = patientRepository.findByUser_Email(patientEmail)
        // .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy thông tin
        // bệnh nhân"));

        // Doctor doctor = doctorRepository.findById(request.getDoctorId())
        // .orElseThrow(() -> new ResourceNotFoundException(
        // "Bác sĩ không tồn tại: " + request.getDoctorId()));

        // validateDoctorCapacity(doctor.getId(),
        // request.getAppointmentTime().toLocalDate());

        // Appointment appointment = Appointment.builder()
        // .patient(patient)
        // .doctor(doctor)
        // .appointmentTime(request.getAppointmentTime())
        // .timeSlot(request.getAppointmentTime().toLocalTime().toString())
        // .status(AppointmentStatus.PENDING)
        // .type("ONLINE")
        // .reminderSent(false)
        // .notes(request.getNotes())
        // .build();

        // return toResponse(appointmentRepository.save(appointment));
        // }

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

        /**
         * Tạo lịch khám tiếp nhận trực tiếp (Walk-in) tại quầy.
         * Tự động đặt trạng thái là WAITING, gán số thứ tự hàng đợi và đánh dấu
         * check-in ngay lập tức.
         * DucTKH
         */
        @Override
        @Transactional
        public AppointmentResponse createWalkInAppointment(WalkInAppointmentRequest request) {
                Patient patient = patientRepository.findById(request.getPatientId())
                                .orElseThrow(() -> new ResourceNotFoundException(
                                                "Bệnh nhân không tồn tại: " + request.getPatientId()));

                // Không được phép tạo lịch khám trực tiếp ở thời gian quá khứ
                if (request.getAppointmentTime().isBefore(LocalDateTime.now())) {
                        throw new IllegalArgumentException("Không thể tạo lịch khám trong quá khứ");
                }

                Doctor doctor = doctorRepository.findById(request.getDoctorId())
                                .orElseThrow(() -> new ResourceNotFoundException(
                                                "Bác sĩ không tồn tại: " + request.getDoctorId()));

                // Kiểm tra giới hạn lịch khám trong ngày của bác sĩ được chọn
                validateDoctorCapacity(request.getDoctorId(), request.getAppointmentTime().toLocalDate());

                ClinicService clinicService = null;
                // Kiểm tra nếu lễ tân có lựa chọn dịch vụ khám đi kèm cho bệnh nhân vãng lai
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

        /**
         * Kiểm tra số lượng lịch hẹn trong ngày của bác sĩ xem đã vượt quá giới hạn cho
         * phép hay chưa.
         * Tối đa 30 lịch hẹn/bác sĩ/ngày.
         * DucTKH
         */
        private void validateDoctorCapacity(Long doctorId, LocalDate date) {
                LocalDateTime start = date.atStartOfDay();
                LocalDateTime end = date.plusDays(1).atStartOfDay();

                // Đếm tổng số lịch hẹn của bác sĩ trong ngày có trạng thái CONFIRMED, WAITING
                // hoặc IN_PROGRESS
                long count = appointmentRepository.countByDoctorIdAndAppointmentDateAndStatusIn(
                                doctorId,
                                start,
                                end,
                                List.of(
                                                AppointmentStatus.CONFIRMED,
                                                AppointmentStatus.WAITING,
                                                AppointmentStatus.IN_PROGRESS));

                // Nếu vượt quá giới hạn tối đa, ném ra ngoại lệ hông cho tạo thêm lịch hẹn
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

        private AppointmentResponse toResponse(Appointment a) {
                return AppointmentResponse.builder()
                                .id(a.getId())
                                .patientId(a.getPatient() != null ? a.getPatient().getId() : null)
                                .patientName(a.getPatient() != null ? a.getPatient().getFullName() : null)
                                .patientPhone(a.getPatient() != null ? a.getPatient().getPhone() : null)
                                .doctorId(a.getDoctor() != null ? a.getDoctor().getId() : null)
                                .doctorName(a.getDoctor() != null ? a.getDoctor().getFullName() : null)
                                .serviceName(a.getClinicService() != null ? a.getClinicService().getServiceName() : null)
                                .servicePrice(a.getClinicService() != null ? a.getClinicService().getPrice() : null)
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