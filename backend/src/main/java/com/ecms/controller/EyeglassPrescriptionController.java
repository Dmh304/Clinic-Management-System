// DucTKH
// Controller API quản lý Đơn kính. Cho phép bác sĩ kê đơn kính và bệnh nhân xem đơn kính của mình.
package com.ecms.controller;

import com.ecms.dto.request.EyeglassPrescriptionRequest;
import com.ecms.dto.response.ApiResponse;
import com.ecms.dto.response.EyeglassPrescriptionResponse;
import com.ecms.service.EyeglassPrescriptionService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/eyeglass-prescriptions")
@RequiredArgsConstructor
public class EyeglassPrescriptionController {

    private final EyeglassPrescriptionService eyeglassPrescriptionService;

    // API endpoint: Bác sĩ gửi thông tin tạo đơn kính mới
    @PostMapping
    public ResponseEntity<ApiResponse<EyeglassPrescriptionResponse>> createPrescription(
            @Valid @RequestBody EyeglassPrescriptionRequest request,
            Authentication authentication) {
        EyeglassPrescriptionResponse response = eyeglassPrescriptionService.createPrescription(request, authentication.getName());
        return ResponseEntity.ok(ApiResponse.success("Kê đơn kính thành công", response));
    }

    // API endpoint: Bệnh nhân hoặc Bác sĩ lấy danh sách các đơn kính của bệnh nhân
    @GetMapping("/patient/{patientId}")
    public ResponseEntity<ApiResponse<List<EyeglassPrescriptionResponse>>> getPatientPrescriptions(
            @PathVariable Long patientId) {
        List<EyeglassPrescriptionResponse> responses = eyeglassPrescriptionService.getPatientPrescriptions(patientId);
        return ResponseEntity.ok(ApiResponse.success("Lấy danh sách đơn kính thành công", responses));
    }
}
