// DucTKH
// Controller API quản lý Đơn thuốc. Cung cấp các endpoint cho phép bác sĩ kê đơn, dược sĩ lấy đơn chờ phát/phát thuốc, và bệnh nhân xem đơn thuốc.
package com.ecms.controller;

import com.ecms.dto.request.PrescriptionRequest;
import com.ecms.dto.response.ApiResponse;
import com.ecms.dto.response.PrescriptionResponse;
import com.ecms.service.PrescriptionService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/prescriptions")
@RequiredArgsConstructor
public class PrescriptionController {

    private final PrescriptionService prescriptionService;

    // API endpoint: Bác sĩ gửi thông tin đơn thuốc mới để lưu vào DB 
    @PostMapping
    public ResponseEntity<ApiResponse<PrescriptionResponse>> createPrescription(
            @Valid @RequestBody PrescriptionRequest request,
            Authentication authentication) {
        PrescriptionResponse response = prescriptionService.createPrescription(request, authentication.getName());
        return ResponseEntity.ok(ApiResponse.success("Kê đơn thuốc thành công", response));
    }

    // API endpoint: Lấy danh sách toàn bộ đơn thuốc của một bệnh nhân
    @GetMapping("/patient/{patientId}")
    public ResponseEntity<ApiResponse<List<PrescriptionResponse>>> getPatientPrescriptions(
            @PathVariable Long patientId) {
        List<PrescriptionResponse> responses = prescriptionService.getPatientPrescriptions(patientId);
        return ResponseEntity.ok(ApiResponse.success("Lấy danh sách đơn thuốc thành công", responses));
    }

    // API endpoint: Dược sĩ lấy danh sách các đơn thuốc đang chờ để phát
    @GetMapping("/pending")
    public ResponseEntity<ApiResponse<List<PrescriptionResponse>>> getPendingPrescriptions() {
        List<PrescriptionResponse> responses = prescriptionService.getPendingPrescriptions();
        return ResponseEntity.ok(ApiResponse.success("Lấy danh sách đơn thuốc chờ phát thành công", responses));
    }

    // API endpoint: Cập nhật trạng thái một đơn thuốc thành "Đã phát" 
    @PatchMapping("/{id}/dispense")
    public ResponseEntity<ApiResponse<PrescriptionResponse>> dispensePrescription(@PathVariable Long id) {
        PrescriptionResponse response = prescriptionService.dispensePrescription(id);
        return ResponseEntity.ok(ApiResponse.success("Phát thuốc thành công", response));
    }

    // API endpoint: Cập nhật trạng thái một đơn thuốc thành "Đã hủy/Bỏ qua"
    @PatchMapping("/{id}/skip")
    public ResponseEntity<ApiResponse<PrescriptionResponse>> skipPrescription(@PathVariable Long id) {
        PrescriptionResponse response = prescriptionService.skipPrescription(id);
        return ResponseEntity.ok(ApiResponse.success("Đã đánh dấu bệnh nhân không mua thuốc", response));
    }
}
