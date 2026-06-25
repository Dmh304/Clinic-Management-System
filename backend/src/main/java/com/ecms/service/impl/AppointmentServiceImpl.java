/**
 * Author: DucTKH, TuanTD
 * 
 * Lớp triển khai các dịch vụ quản lý lịch hẹn
 * Cung cấp các chức năng: Đặt lịch online, đăng ký khám vãng lai (Walk-in),
 * Check-in, xác nhận, điều chuyển bác sĩ và thống kê dashboard.
 */

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

        // Giới hạn số lượng lịch hẹn tối đa mà một bác sĩ có thể tiếp nhận trong một
        // ngày
        private static final int MAX_APPOINTMENTS_PER_DOCTOR_PER_DAY = 30;

        // Tiêm các tầng dữ liệu (Repositories) thông qua Constructor Injection của
        // Lombok (@RequiredArgsConstructor)
        private final AppointmentRepository appointmentRepository;
        private final DoctorRepository doctorRepository;
        private final PatientRepository patientRepository;
        private final ClinicServiceRepository clinicServiceRepository;

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

                return toResponse(appointmentRepository.save(appointment));
        }

        /* Thực hiện thủ tục Check-in cho bệnh nhân khi họ đến phòng khám trực tiếp */
        @Override
        @Transactional
        public AppointmentResponse checkInAppointment(Long id) {
                // Kiểm tra sự tồn tại của lịch hẹn
                Appointment appointment = appointmentRepository.findById(id)
                                .orElseThrow(() -> new ResourceNotFoundException("Lịch hẹn không tồn tại: " + id));

                // Ràng buộc nghiệp vụ: Bệnh nhân bắt buộc phải có lịch đã được CONFIRMED trước
                // đó mới được check-in
                if (appointment.getStatus() != AppointmentStatus.CONFIRMED) {
                        throw new IllegalStateException("Chỉ lịch hẹn CONFIRMED mới được check-in");
                }

                LocalDate appointmentDate = appointment.getAppointmentDate();
                appointment.setStatus(AppointmentStatus.WAITING); // Chuyển sang trạng thái hàng đợi chờ khám
                appointment.setCheckInTime(LocalDateTime.now()); // Ghi nhận thời gian có mặt thực tế

                // Cấp số thứ tự khám tự động tăng trong ngày nếu lịch này chưa được cấp số
                if (appointment.getQueueNumber() == null) {
                        appointment.setQueueNumber(nextQueueNumber(appointmentDate));
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

                // Kiểm tra giới hạn số ca khám trong ngày của bác sĩ được chọn
                validateDoctorCapacity(doctor.getId(), request.getAppointmentTime().toLocalDate());

                // Khởi tạo đối tượng lịch hẹn mới dạng ONLINE
                Appointment appointment = Appointment.builder()
                                .patient(patient)
                                .doctor(doctor)
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
                                .queueNumber(nextQueueNumber(appointmentDate)) // Cấp số thứ tự ngay lập tức
                                .checkInTime(LocalDateTime.now()) // Thời gian vào quầy cũng chính là thời gian check-in
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

                // Cập nhật bác sĩ mới nếu có yêu cầu điều chuyển
                if (request.getDoctorId() != null) {
                        Doctor doctor = doctorRepository.findById(request.getDoctorId())
                                        .orElseThrow(() -> new ResourceNotFoundException(
                                                        "Bác sĩ không tồn tại: " + request.getDoctorId()));
                        appointment.setDoctor(doctor);
                }

                // Cập nhật mốc thời gian khám mới nếu có yêu cầu dời lịch
                if (request.getNewAppointmentTime() != null) {
                        appointment.setAppointmentTime(request.getNewAppointmentTime());
                        appointment.setTimeSlot(request.getNewAppointmentTime().toLocalTime().toString());
                }

                // Ghi chú lại lý do chuyển lịch (Lễ tân đổi hoặc bác sĩ bận đột xuất,...)
                if (request.getReason() != null) {
                        appointment.setNotes(request.getReason());
                }

                return toResponse(appointmentRepository.save(appointment));
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

        /* Tính toán số thứ tự (Queue Number) tiếp theo cho bệnh nhân trong ngày */
        private Integer nextQueueNumber(LocalDate date) {
                LocalDateTime start = date.atStartOfDay();
                LocalDateTime end = date.plusDays(1).atStartOfDay();

                // Truy vấn tìm số thứ tự (max queue) lớn nhất hiện tại của ngày đó
                // dựa trên các trạng thái hợp lệ: đang chờ khám, đang khám hoặc đã hoàn thành
                Integer max = appointmentRepository.findMaxQueueNumberByDate(
                                start,
                                end,
                                List.of(
                                                AppointmentStatus.WAITING,
                                                AppointmentStatus.IN_PROGRESS,
                                                AppointmentStatus.COMPLETED));

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

        /*
         * Ánh xạ dữ liệu (Mapping) từ đối tượng Entity (Appointment) sang đối tượng
         * Data Transfer Object (AppointmentResponse)
         */
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
                                // Kiểm tra dịch vụ y tế đăng ký khám
                                .serviceName(a.getClinicService() != null ? a.getClinicService().getServiceName()
                                                : null)
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