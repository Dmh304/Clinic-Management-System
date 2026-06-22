package com.ecms.controller;

import com.ecms.dto.request.BookAppointmentRequest;
import com.ecms.dto.request.ReassignAppointmentRequest;
import com.ecms.dto.request.WalkInAppointmentRequest;
import com.ecms.dto.response.ApiResponse;
import com.ecms.dto.response.AppointmentDashboardResponse;
import com.ecms.dto.response.AppointmentResponse;
import com.ecms.entity.AppointmentStatus;
import com.ecms.entity.Doctor;
import com.ecms.entity.Patient;
import com.ecms.repository.DoctorRepository;
import com.ecms.repository.PatientRepository;
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

        /* Lấy danh sách tất cả các lịch hẹn có trong hệ thống */
        @GetMapping
        public ResponseEntity<ApiResponse<List<AppointmentResponse>>> getAllAppointments() {
                return ResponseEntity.ok(
                                ApiResponse.success(appointmentService.getAllAppointments()));
        }

        @GetMapping("/today")
        public ResponseEntity<ApiResponse<List<AppointmentResponse>>> getTodayAppointments() {
                return ResponseEntity.ok(
                                ApiResponse.success(appointmentService.getTodayAppointments()));
        }

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

        @PatchMapping("/{id}/confirm")
        public ResponseEntity<ApiResponse<AppointmentResponse>> confirmAppointment(
                        @PathVariable Long id,
                        @RequestBody(required = false) ConfirmAppointmentRequest request) {
                Long doctorId = request != null ? request.getDoctorId() : null;

                return ResponseEntity.ok(
                                ApiResponse.success(appointmentService.confirmAppointment(id, doctorId)));
        }

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

        @PostMapping("/walk-in")
        public ResponseEntity<ApiResponse<AppointmentResponse>> createWalkInAppointment(
                        @Valid @RequestBody WalkInAppointmentRequest request) {
                return ResponseEntity.ok(
                                ApiResponse.success(appointmentService.createWalkInAppointment(request)));
        }

        @GetMapping("/my")
        public ResponseEntity<ApiResponse<List<AppointmentResponse>>> getMyAppointments(
                        @AuthenticationPrincipal UserDetails userDetails) {
                Long patientId = resolvePatientId(userDetails);
                return ResponseEntity.ok(
                                ApiResponse.success(appointmentService.getMyAppointments(patientId)));
        }

        /* Lớp DTO nội bộ chứa thông tin bổ sung xác nhận lịch hẹn */

        /** Chuyển lịch hẹn (đổi bác sĩ / giờ) — MANAGER */
        @PatchMapping("/{id}/reassign")
        public ResponseEntity<ApiResponse<AppointmentResponse>> reassign(
                        @PathVariable Long id,
                        @RequestBody ReassignAppointmentRequest request) {
                return ResponseEntity.ok(
                                ApiResponse.success("Chuyển lịch hẹn thành công",
                                                appointmentService.reassignAppointment(id, request)));
        }

        /** Lịch hẹn trong ngày theo bác sĩ — public for MANAGER/RECEPTIONIST */
        @GetMapping("/daily-schedule")
        public ResponseEntity<ApiResponse<List<AppointmentResponse>>> getDailySchedule(
                        @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
                LocalDate targetDate = date != null ? date : LocalDate.now();
                return ResponseEntity.ok(ApiResponse.success(appointmentService.getDailySchedule(targetDate)));
        }

        /** Lịch hẹn trong khoảng ngày — dùng cho calendar view tuần/tháng */
        @GetMapping("/schedule-range")
        public ResponseEntity<ApiResponse<List<AppointmentResponse>>> getScheduleRange(
                        @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
                        @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate) {
                return ResponseEntity.ok(ApiResponse.success(appointmentService.getScheduleRange(startDate, endDate)));
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

        /* Tìm kiếm và trả về id của bác sĩ dựa trên thông tin tài khoản đăng nhập */
        private Long resolvePatientId(UserDetails userDetails) {
                if (userDetails == null) {
                        return null;
                }
                return patientRepository.findByEmail(userDetails.getUsername()).map(Patient::getId).orElse(null);
        }
}