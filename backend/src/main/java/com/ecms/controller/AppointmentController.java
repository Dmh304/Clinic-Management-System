package com.ecms.controller;

import com.ecms.dto.response.ApiResponse;
import com.ecms.dto.response.AppointmentResponse;
import com.ecms.entity.AppointmentStatus;
import com.ecms.service.AppointmentService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/appointments")
@RequiredArgsConstructor
public class AppointmentController {

    private final AppointmentService appointmentService;

    @GetMapping("/today")
    public ResponseEntity<ApiResponse<List<AppointmentResponse>>> getTodayAppointments() {
        return ResponseEntity.ok(ApiResponse.success(appointmentService.getTodayAppointments()));
    }

    @PatchMapping("/{id}/status")
    public ResponseEntity<ApiResponse<AppointmentResponse>> updateStatus(
            @PathVariable Long id,
            @RequestParam AppointmentStatus status) {
        return ResponseEntity.ok(ApiResponse.success(appointmentService.updateAppointmentStatus(id, status)));
    }
}
