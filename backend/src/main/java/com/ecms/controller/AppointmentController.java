
/**
 * Author: TuanTD
 * 
 * Controller quản lý toàn bộ các nghiệp vụ liên quan đến Lịch hẹn (Appointments)
 * Cung cấp các API dành cho Bác sĩ, Nhân viên tiếp tân (Receptionist), Quản lý (Manager) và Bệnh nhân
 * * Base URL: /api/v1/appointments
 */

package com.ecms.controller;

import com.ecms.dto.request.BookAppointmentRequest;
import com.ecms.dto.request.CancelAppointmentRequest;
import com.ecms.dto.request.ReassignAppointmentRequest;
import com.ecms.dto.request.RescheduleAppointmentRequest;
import com.ecms.dto.request.UpdateAppointmentNotesRequest;
import com.ecms.dto.request.WalkInAppointmentRequest;
import com.ecms.dto.response.ApiResponse;
import com.ecms.dto.response.AppointmentDashboardResponse;
import com.ecms.dto.response.AppointmentResponse;
import com.ecms.dto.response.SlotAvailabilityResponse;
import com.ecms.entity.AppointmentStatus;
import com.ecms.entity.Doctor;
import com.ecms.entity.Patient;
import com.ecms.entity.User;
import com.ecms.repository.DoctorRepository;
import com.ecms.repository.PatientRepository;
import com.ecms.repository.UserRepository;
import com.ecms.service.AppointmentService;
import jakarta.validation.Valid;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/v1/appointments")
@RequiredArgsConstructor
public class AppointmentController {

        private final AppointmentService appointmentService;
        private final DoctorRepository doctorRepository;
        private final PatientRepository patientRepository;
        private final UserRepository userRepository;

        /* Lấy danh sách tất cả các lịch hẹn có trong hệ thống */
        @GetMapping
        public ResponseEntity<ApiResponse<List<AppointmentResponse>>> getAllAppointments() {
                return ResponseEntity.ok(
                                ApiResponse.success(appointmentService.getAllAppointments()));
        }

        /* Lấy danh sách tất cả các lịch hẹn được lên lịch trong ngày hôm nay */
        @GetMapping("/today")
        public ResponseEntity<ApiResponse<List<AppointmentResponse>>> getTodayAppointments() {
                return ResponseEntity.ok(
                                ApiResponse.success(appointmentService.getTodayAppointments()));
        }

        /* Tìm kiếm lịch hẹn dựa trên từ khóa (Tên bệnh nhân, số điện thoại) */
        @GetMapping("/search")
        public ResponseEntity<ApiResponse<List<AppointmentResponse>>> searchAppointments(
                        @RequestParam(required = false) String keyword) {
                return ResponseEntity.ok(
                                ApiResponse.success(appointmentService.searchAppointments(keyword)));
        }

        /**
         * Lấy danh sách hàng đợi khám (Queue) theo ngày
         * - Nếu tài khoản đăng nhập là Bác sĩ: Trả về danh sách khám của riêng bác sĩ
         * đó
         * - Nếu là vai trò khác (Hành chính/Quản lý): Trả về toàn bộ danh sách khám của
         * ngày đó
         */
        @GetMapping("/doctor-queue")
        public ResponseEntity<ApiResponse<List<AppointmentResponse>>> getDoctorQueue(
                        @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date,
                        @AuthenticationPrincipal UserDetails userDetails) {
                // Xác thực xem user đang đăng nhập có phải là Bác sĩ không và lấy Doctor ID
                Long doctorId = resolveDoctorId(userDetails);
                if (doctorId != null) {
                        // Nếu là bác sĩ, chỉ lấy danh sách hàng đợi của bác sĩ đó
                        return ResponseEntity
                                        .ok(ApiResponse.success(appointmentService.getDoctorQueue(date, doctorId)));
                }
                // Nếu không phải bác sĩ (ví dụ: Tiếp tân), lấy danh sách tổng hợp
                return ResponseEntity.ok(
                                ApiResponse.success(appointmentService.getDoctorQueue(date)));
        }

        /**
         * Lấy dữ liệu thống kê (Dashboard) tổng quan về lịch hẹn theo ngày
         * - Nếu là Bác sĩ: Thống kê số liệu cá nhân (Số ca đã khám, đang đợi, hủy...)
         * - Nếu là Quản lý/Tiếp tân: Thống kê số liệu của toàn bộ phòng khám/bệnh viện
         */
        @GetMapping("/dashboard")
        public ResponseEntity<ApiResponse<AppointmentDashboardResponse>> getDashboard(
                        @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date,
                        @AuthenticationPrincipal UserDetails userDetails) {
                Long doctorId = resolveDoctorId(userDetails);
                if (doctorId != null) {
                        return ResponseEntity.ok(ApiResponse.success(appointmentService.getDashboard(date, doctorId)));
                }
                return ResponseEntity.ok(
                                ApiResponse.success(appointmentService.getDashboard(date)));
        }

        /* Cập nhật trạng thái trực tiếp của một lịch hẹn */
        @PatchMapping("/{id}/status")
        public ResponseEntity<ApiResponse<AppointmentResponse>> updateStatus(
                        @PathVariable Long id,
                        @RequestParam AppointmentStatus status) {
                return ResponseEntity.ok(
                                ApiResponse.success(appointmentService.updateAppointmentStatus(id, status)));
        }

        /* Xác nhận (Confirm) một lịch hẹn đăng ký online */
        @PatchMapping("/{id}/confirm")
        public ResponseEntity<ApiResponse<AppointmentResponse>> confirmAppointment(
                        @PathVariable Long id,
                        @RequestBody(required = false) ConfirmAppointmentRequest request) {
                Long doctorId = request != null ? request.getDoctorId() : null;
                String reason = request != null ? request.getReason() : null;

                return ResponseEntity.ok(
                                ApiResponse.success(appointmentService.confirmAppointment(id, doctorId, reason)));
        }

        /* Đánh dấu bệnh nhân đã đến phòng khám và check-in vào hàng đợi */
        @PatchMapping("/{id}/check-in")
        public ResponseEntity<ApiResponse<AppointmentResponse>> checkInAppointment(
                        @PathVariable Long id,
                        @AuthenticationPrincipal UserDetails userDetails) {
                // UC-15: lấy id của nhân viên (Lễ tân) đang đăng nhập để lưu vào check_in_by
                Long checkInByUserId = userDetails != null
                                ? userRepository.findByEmail(userDetails.getUsername()).map(User::getId).orElse(null)
                                : null;
                return ResponseEntity.ok(
                                ApiResponse.success(appointmentService.checkInAppointment(id, checkInByUserId)));
        }

        /* Đặt lịch hẹn trực tuyến */
        @PostMapping("/book")
        public ResponseEntity<ApiResponse<AppointmentResponse>> bookOnlineAppointment(
                        @Valid @RequestBody BookAppointmentRequest request,
                        @AuthenticationPrincipal UserDetails userDetails) {
                return ResponseEntity.ok(
                                ApiResponse.success(appointmentService.bookOnlineAppointment(request,
                                                userDetails.getUsername())));
        }

        /*
         * Tạo lịch hẹn trực tiếp tại quầy (Walk-in) - Dành cho Tiếp tân (RECEPTIONIST)
         */
        /**
         * Khung giờ còn trống của 1 bác sĩ trong 1 ngày — bệnh nhân chọn khi đặt lịch
         */
        @GetMapping("/available-slots")
        public ResponseEntity<ApiResponse<List<SlotAvailabilityResponse>>> getAvailableSlots(
                        @RequestParam Long doctorId,
                        @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
                return ResponseEntity.ok(
                                ApiResponse.success(appointmentService.getAvailableSlots(doctorId, date)));
        }

        @PostMapping("/walk-in")
        public ResponseEntity<ApiResponse<AppointmentResponse>> createWalkInAppointment(
                        @Valid @RequestBody WalkInAppointmentRequest request) {
                return ResponseEntity.ok(
                                ApiResponse.success(appointmentService.createWalkInAppointment(request)));
        }

        /* Lấy danh sách toàn bộ lịch hẹn của Bệnh nhân đang đăng nhập */
        @GetMapping("/my")
        public ResponseEntity<ApiResponse<List<AppointmentResponse>>> getMyAppointments(
                        @AuthenticationPrincipal UserDetails userDetails) {
                // Theo USER (không phải patientId) để gồm cả lịch đặt hộ người thân
                Long userId = userDetails != null
                                ? userRepository.findByEmail(userDetails.getUsername()).map(User::getId).orElse(null)
                                : null;
                return ResponseEntity.ok(
                                ApiResponse.success(appointmentService.getMyAppointments(userId)));
        }

        /*
         * Điều chuyển lịch hẹn (Đổi bác sĩ khám hoặc đổi khung giờ) - Quyền MANAGER
         * hoặc RECEPTIONIST
         */
        @PatchMapping("/{id}/reassign")
        public ResponseEntity<ApiResponse<AppointmentResponse>> reassign(
                        @PathVariable Long id,
                        @RequestBody ReassignAppointmentRequest request) {
                return ResponseEntity.ok(
                                ApiResponse.success("Chuyển lịch hẹn thành công",
                                                appointmentService.reassignAppointment(id, request)));
        }

        /* Lấy lịch trình phân bổ hẹn khám tổng thể trong một ngày cụ thể */
        @GetMapping("/daily-schedule")
        public ResponseEntity<ApiResponse<List<AppointmentResponse>>> getDailySchedule(
                        @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
                LocalDate targetDate = date != null ? date : LocalDate.now();
                return ResponseEntity.ok(ApiResponse.success(appointmentService.getDailySchedule(targetDate)));
        }

        /**
         * Huỷ lịch hẹn — PATIENT (chỉ lịch của mình, áp BR-05) hoặc
         * RECEPTIONIST/MANAGER/ADMIN
         */
        @PatchMapping("/{id}/cancel")
        public ResponseEntity<ApiResponse<AppointmentResponse>> cancelAppointment(
                        @PathVariable Long id,
                        @RequestBody(required = false) CancelAppointmentRequest request,
                        @AuthenticationPrincipal UserDetails userDetails) {
                boolean isPatientSelf = patientRepository.findByEmail(userDetails.getUsername()).isPresent();
                return ResponseEntity.ok(ApiResponse.success(
                                appointmentService.cancelAppointment(id, request, userDetails.getUsername(),
                                                isPatientSelf)));
        }

        /** Bệnh nhân tự đổi giờ khám lịch hẹn của mình (trong policy) */
        @PatchMapping("/{id}/reschedule")
        public ResponseEntity<ApiResponse<AppointmentResponse>> reschedule(
                        @PathVariable Long id,
                        @RequestBody RescheduleAppointmentRequest request,
                        @AuthenticationPrincipal UserDetails userDetails) {
                return ResponseEntity.ok(ApiResponse.success(
                                appointmentService.reschedulePatientAppointment(id, request,
                                                userDetails.getUsername())));
        }

        /** Lễ tân ghi chú thêm cho lịch hẹn */
        @PatchMapping("/{id}/notes")
        public ResponseEntity<ApiResponse<AppointmentResponse>> updateNotes(
                        @PathVariable Long id,
                        @RequestBody UpdateAppointmentNotesRequest request) {
                return ResponseEntity.ok(ApiResponse.success(
                                appointmentService.updateAppointmentNotes(id, request)));
        }

        /**
         * Chi tiết 1 lịch hẹn theo id — dùng cho modal chi tiết (vd mở từ thông báo)
         */
        @GetMapping("/{id:[0-9]+}")
        public ResponseEntity<ApiResponse<AppointmentResponse>> getById(@PathVariable Long id) {
                return ResponseEntity.ok(ApiResponse.success(appointmentService.getAppointmentById(id)));
        }

        /**
         * UC-13: Gửi nhắc lịch thủ công cho 1 lịch hẹn (bỏ qua cửa sổ 24h) —
         * RECEPTIONIST/ADMIN
         */
        @PostMapping("/{id}/send-reminder")
        public ResponseEntity<ApiResponse<AppointmentResponse>> sendReminder(@PathVariable Long id) {
                return ResponseEntity.ok(
                                ApiResponse.success("Đã gửi nhắc lịch", appointmentService.sendReminder(id)));
        }

        /** Lịch hẹn trong khoảng ngày — dùng cho calendar view tuần/tháng */
        @GetMapping("/schedule-range")
        public ResponseEntity<ApiResponse<List<AppointmentResponse>>> getScheduleRange(
                        @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
                        @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate) {
                return ResponseEntity.ok(ApiResponse.success(appointmentService.getScheduleRange(startDate, endDate)));
        }

        /*
         * DTO nội bộ (Inner Static Class) nhận thông tin bổ sung khi xác nhận lịch hẹn
         */
        @Data
        public static class ConfirmAppointmentRequest {
                private Long doctorId;
                /** Bắt buộc khi lễ tân đổi sang bác sĩ khác với bác sĩ bệnh nhân đã đặt */
                private String reason;

        }

        /* Tìm kiếm và trả về ID của Bác sĩ dựa trên Email tài khoản đăng nhập */
        private Long resolveDoctorId(UserDetails userDetails) {
                if (userDetails == null) {
                        return null;
                }
                return doctorRepository.findByEmail(userDetails.getUsername()).map(Doctor::getId).orElse(null);
        }

        /**
         * Tìm kiếm và trả về ID của Bệnh nhân dựa trên Email tài khoản đăng nhập
         * Cơ chế tìm kiếm 2 bước:
         * 1. Tìm thông qua tài khoản User liên kết (Đối với bệnh nhân đăng ký tài khoản
         * hệ thống)
         * 2. Nếu không thấy, tìm kiếm trực tiếp bằng email trong bảng Patient (Đối với
         * bệnh nhân vãng lai/walk-in được lưu email)
         */
        private Long resolvePatientId(UserDetails userDetails) {
                if (userDetails == null) {
                        return null;
                }
                return patientRepository.findByUser_Email(userDetails.getUsername())
                                .map(Patient::getId)
                                .orElseGet(() ->
                                // Fallback: tìm theo email trực tiếp trong bảng patients (dành cho ca walk-in
                                // trước đó)
                                patientRepository.findByEmail(userDetails.getUsername())
                                                .map(Patient::getId)
                                                .orElse(null));
        }
}