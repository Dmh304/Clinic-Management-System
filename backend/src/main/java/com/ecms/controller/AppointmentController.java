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

        private final AppointmentService appointmentService;
        private final DoctorRepository doctorRepository;

        @GetMapping
        public ResponseEntity<ApiResponse<List<AppointmentResponse>>> getAllAppointments() {
                return ResponseEntity.ok(
                                ApiResponse.success(appointmentService.getAllAppointments()));
        }

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

        @PatchMapping("/{id}/status")
        public ResponseEntity<ApiResponse<AppointmentResponse>> updateStatus(
                        @PathVariable Long id,
                        @RequestParam AppointmentStatus status) {
                return ResponseEntity.ok(
                                ApiResponse.success(appointmentService.updateAppointmentStatus(id, status)));
        }

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

        @PostMapping("/book")
        public ResponseEntity<ApiResponse<AppointmentResponse>> bookOnlineAppointment(
                        @Valid @RequestBody BookAppointmentRequest request,
                        @AuthenticationPrincipal UserDetails userDetails) {
                return ResponseEntity.ok(
                                ApiResponse.success(appointmentService.bookOnlineAppointment(request,
                                                userDetails.getUsername())));
        }

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

        @Data
        public static class ConfirmAppointmentRequest {
                private Long doctorId;
        }

        private Long resolveDoctorId(UserDetails userDetails) {
                if (userDetails == null) {
                        return null;
                }
                return doctorRepository.findByEmail(userDetails.getUsername()).map(Doctor::getId).orElse(null);
        }
}