package com.ecms.controller;

import com.ecms.dto.request.EMRRequest;
import com.ecms.dto.response.ApiResponse;
import com.ecms.dto.response.EMRResponse;
import com.ecms.service.EMRService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/emr")
@RequiredArgsConstructor
public class EMRController {

    private final EMRService emrService;

    @PostMapping
    public ResponseEntity<ApiResponse<EMRResponse>> saveEMR(@RequestBody EMRRequest request) {
        return ResponseEntity.ok(ApiResponse.success(emrService.saveEMR(request)));
    }

    @GetMapping("/appointment/{appointmentId}")
    public ResponseEntity<ApiResponse<EMRResponse>> getByAppointment(@PathVariable Long appointmentId) {
        return ResponseEntity.ok(ApiResponse.success(emrService.getByAppointmentId(appointmentId)));
    }

    @GetMapping("/patient/{patientId}/history")
    public ResponseEntity<ApiResponse<List<EMRResponse>>> getPatientHistory(@PathVariable Long patientId) {
        return ResponseEntity.ok(ApiResponse.success(emrService.getPatientHistory(patientId)));
    }
}
