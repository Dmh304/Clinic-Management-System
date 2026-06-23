/**
 * Author: Tuấn - HE204215
 * 
 * Controller quản lí các hoạt động liên quan đến lịch hẹn
 * Cung cấp các API cho phép tìm kiếm, cập nhật trạng thái, đặt lịch hẹn
 */

package com.ecms.controller;

import com.ecms.dto.request.BookAppointmentRequest;
import com.ecms.dto.request.WalkInAppointmentRequest;
import com.ecms.dto.response.ApiResponse;
import com.ecms.dto.response.AppointmentDashboardResponse;
import com.ecms.dto.response.AppointmentResponse;
import com.ecms.entity.AppointmentStatus;
import com.ecms.entity.Doctor;
import com.ecms.repository.DoctorRepository;
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

/**
 * Controller quản lý các yêu cầu liên quan đến Lịch hẹn (Appointments).
 * DucTKH
 */
@RestController
@RequestMapping("/api/v1/appointments")
@RequiredArgsConstructor
public class AppointmentController {

        /* Dịch vụ xử lí logic nghiệp vụ của lịch hẹn */
        private final AppointmentService appointmentService;

        /* Kho lưu trữ dữ liệu thông tin bác sĩ */
        private final DoctorRepository doctorRepository;

        /* Lấy danh sách tất cả các lịch hẹn có trong hệ thống */
        @GetMapping
        public ResponseEntity<ApiResponse<List<AppointmentResponse>>> getAllAppointments() {
                return ResponseEntity.ok(
                                ApiResponse.success(appointmentService.getAllAppointments()));
        }

        /* Lấy danh sách các lịch hẹn trong ngày hôm nay */
        /**
         * API Lấy danh sách lịch hẹn trong ngày hôm nay của phòng khám.
         * 
         * @return ResponseEntity danh sách lịch hẹn trong ngày.
         * @author DucTKH
         */
        @GetMapping("/today")
        public ResponseEntity<ApiResponse<List<AppointmentResponse>>> getTodayAppointments() {
                return ResponseEntity.ok(
                                ApiResponse.success(appointmentService.getTodayAppointments()));
        }

        /* Tìm kiếm lịch hẹn dựa trên từ khóa */
        /**
         * API Tìm kiếm danh sách lịch hẹn theo từ khóa.
         * 
         * @param keyword Từ khóa tìm kiếm (họ tên bệnh nhân hoặc số điện thoại).
         * @return ResponseEntity chứa danh sách kết quả phù hợp.
         * @author DucTKH
         */
        @GetMapping("/search")
        public ResponseEntity<ApiResponse<List<AppointmentResponse>>> searchAppointments(
                        @RequestParam(required = false) String keyword) {
                return ResponseEntity.ok(
                                ApiResponse.success(appointmentService.searchAppointments(keyword)));
        }

        /* Lấy danh sách hàng đợi lịch hẹn của bác sĩ theo ngày */
        @GetMapping("/doctor-queue")
        public ResponseEntity<ApiResponse<List<AppointmentResponse>>> getDoctorQueue(
                        @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date,
                        @AuthenticationPrincipal UserDetails userDetails) {
                Long doctorId = resolveDoctorId(userDetails);
                if (doctorId != null) {
                        return ResponseEntity
                                        .ok(ApiResponse.success(appointmentService.getDoctorQueue(date, doctorId)));
                }
                return ResponseEntity.ok(
                                ApiResponse.success(appointmentService.getDoctorQueue(date)));
        }

        /* Lấy thông tin thống kê của các lịch hẹn theo ngày */
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

        /* Cập nhật trạng thái của một lịch hẹn cụ thể */
        @PatchMapping("/{id}/status")
        public ResponseEntity<ApiResponse<AppointmentResponse>> updateStatus(
                        @PathVariable Long id,
                        @RequestParam AppointmentStatus status) {
                return ResponseEntity.ok(
                                ApiResponse.success(appointmentService.updateAppointmentStatus(id, status)));
        }

        /* Xác nhận một lịch hẹn và có thể chỉ định bác sĩ đến khám */
        /**
         * API Xác nhận lịch hẹn.
         * DucTKH
         */
        @PatchMapping("/{id}/confirm")
        public ResponseEntity<ApiResponse<AppointmentResponse>> confirmAppointment(
                        @PathVariable Long id,
                        @RequestBody(required = false) ConfirmAppointmentRequest request) {
                Long doctorId = request != null ? request.getDoctorId() : null;

                return ResponseEntity.ok(
                                ApiResponse.success(appointmentService.confirmAppointment(id, doctorId)));
        }

        /* Thực hiện thủ tục check-in cho bệnh nhân khi họ đến phòng khám */
        /**
         * API Tiếp nhận bệnh nhân (Check-in).
         * DucTKH
         */
        @PatchMapping("/{id}/check-in")
        public ResponseEntity<ApiResponse<AppointmentResponse>> checkInAppointment(
                        @PathVariable Long id) {
                return ResponseEntity.ok(
                                ApiResponse.success(appointmentService.checkInAppointment(id)));
        }

        /* Lấy danh sách khung giờ đã được đặt của một bác sĩ trong một ngày */
        @GetMapping("/available-slots")
        public ResponseEntity<ApiResponse<List<String>>> getAvailableSlots(
                        @RequestParam Long doctorId,
                        @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
                return ResponseEntity.ok(
                                ApiResponse.success(appointmentService.getBookedSlots(doctorId, date)));
        }

        /* Đặt lịch hẹn trực tuyến bởi bệnh nhân */
        @PostMapping("/book")
        public ResponseEntity<ApiResponse<AppointmentResponse>> bookOnlineAppointment(
                        @Valid @RequestBody BookAppointmentRequest request,
                        @AuthenticationPrincipal UserDetails userDetails) {
                return ResponseEntity.ok(
                                ApiResponse.success(appointmentService.bookOnlineAppointment(request,
                                                userDetails.getUsername())));
        }

        /* Tạo lịch hẹn trực tiếp tại quầy tiếp đón */
        /**
         * API Tạo lịch khám trực tiếp (Walk-in).
         * DucTKH
         */
        @PostMapping("/walk-in")
        public ResponseEntity<ApiResponse<AppointmentResponse>> createWalkInAppointment(
                        @Valid @RequestBody WalkInAppointmentRequest request) {
                return ResponseEntity.ok(
                                ApiResponse.success(appointmentService.createWalkInAppointment(request)));
        }

        /* Lớp DTO nội bộ chứa thông tin bổ sung xác nhận lịch hẹn */
        @Data
        public static class ConfirmAppointmentRequest {
                /** Mã định danh của bác sĩ được phân công cho lịch hẹn này */
                private Long doctorId;
        }

        /* Tìm kiếm và trả về id của bác sĩ dựa trên thông tin tài khoản đăng nhập */
        private Long resolveDoctorId(UserDetails userDetails) {
                if (userDetails == null) {
                        return null;
                }
                return doctorRepository.findByEmail(userDetails.getUsername()).map(Doctor::getId).orElse(null);
        }
}