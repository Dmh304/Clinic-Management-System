package com.ecms.controller;

import com.ecms.dto.request.WalkInAppointmentRequest;
import com.ecms.dto.response.ApiResponse;
import com.ecms.dto.response.AppointmentDashboardResponse;
import com.ecms.dto.response.AppointmentResponse;
import com.ecms.entity.AppointmentStatus;
import com.ecms.service.AppointmentService;
import jakarta.validation.Valid;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/v1/appointments")
@RequiredArgsConstructor
public class AppointmentController {

    private final AppointmentService appointmentService;

    @GetMapping
    public ResponseEntity<ApiResponse<List<AppointmentResponse>>> getAllAppointments() {
        return ResponseEntity.ok(
                ApiResponse.success(appointmentService.getAllAppointments())
        );
    }

    @GetMapping("/today")
    public ResponseEntity<ApiResponse<List<AppointmentResponse>>> getTodayAppointments() {
        return ResponseEntity.ok(
                ApiResponse.success(appointmentService.getTodayAppointments())
        );
    }

    @GetMapping("/search")
    public ResponseEntity<ApiResponse<List<AppointmentResponse>>> searchAppointments(
            @RequestParam(required = false) String keyword
    ) {
        return ResponseEntity.ok(
                ApiResponse.success(appointmentService.searchAppointments(keyword))
        );
    }

    @GetMapping("/doctor-queue")
    public ResponseEntity<ApiResponse<List<AppointmentResponse>>> getDoctorQueue(
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
            LocalDate date
    ) {
        return ResponseEntity.ok(
                ApiResponse.success(appointmentService.getDoctorQueue(date))
        );
    }

    @GetMapping("/dashboard")
    public ResponseEntity<ApiResponse<AppointmentDashboardResponse>> getDashboard(
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
            LocalDate date
    ) {
        return ResponseEntity.ok(
                ApiResponse.success(appointmentService.getDashboard(date))
        );
    }

    @PatchMapping("/{id}/status")
    public ResponseEntity<ApiResponse<AppointmentResponse>> updateStatus(
            @PathVariable Long id,
            @RequestParam AppointmentStatus status
    ) {
        return ResponseEntity.ok(
                ApiResponse.success(appointmentService.updateAppointmentStatus(id, status))
        );
    }

    @PatchMapping("/{id}/confirm")
    public ResponseEntity<ApiResponse<AppointmentResponse>> confirmAppointment(
            @PathVariable Long id,
            @RequestBody(required = false) ConfirmAppointmentRequest request
    ) {
        Long doctorId = request != null ? request.getDoctorId() : null;

        return ResponseEntity.ok(
                ApiResponse.success(appointmentService.confirmAppointment(id, doctorId))
        );
    }

    @PatchMapping("/{id}/check-in")
    public ResponseEntity<ApiResponse<AppointmentResponse>> checkInAppointment(
            @PathVariable Long id
    ) {
        return ResponseEntity.ok(
                ApiResponse.success(appointmentService.checkInAppointment(id))
        );
    }

    @PostMapping("/walk-in")
    public ResponseEntity<ApiResponse<AppointmentResponse>> createWalkInAppointment(
            @Valid @RequestBody WalkInAppointmentRequest request
    ) {
        return ResponseEntity.ok(
                ApiResponse.success(appointmentService.createWalkInAppointment(request))
        );
    }

    @Data
    public static class ConfirmAppointmentRequest {
        private Long doctorId;
    }
}