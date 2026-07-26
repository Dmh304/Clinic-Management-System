//Author: DucTKH - HE204463
//Created: 2026-06-22
//Last Update: 2026-07-26
//Controller API quản lý Đơn kính. Cho phép bác sĩ kê đơn kính và bệnh nhân xem đơn kính của mình.
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

    // Chức năng: Bác sĩ gửi thông tin tạo đơn kính mới (kèm kết quả đo thị lực)
    @PostMapping
    public ResponseEntity<ApiResponse<EyeglassPrescriptionResponse>> createPrescription(
            @Valid @RequestBody EyeglassPrescriptionRequest request,
            Authentication authentication) {
        EyeglassPrescriptionResponse response = eyeglassPrescriptionService.createPrescription(request,
                authentication.getName());
        return ResponseEntity.ok(ApiResponse.success("Kê đơn kính thành công", response));
    }

    // Chức năng: Cập nhật thông tin đơn kính (chỉ cho phép khi chưa đặt hàng)
    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<EyeglassPrescriptionResponse>> updatePrescription(
            @PathVariable Long id,
            @Valid @RequestBody EyeglassPrescriptionRequest request,
            Authentication authentication) {
        EyeglassPrescriptionResponse response = eyeglassPrescriptionService.updatePrescription(id, request,
                authentication.getName());
        return ResponseEntity.ok(ApiResponse.success("Cập nhật đơn kính thành công", response));
    }

    // Chức năng: Xóa đơn kính (hủy bỏ)
    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> deletePrescription(
            @PathVariable Long id,
            Authentication authentication) {
        eyeglassPrescriptionService.deletePrescription(id, authentication.getName());
        return ResponseEntity.ok(ApiResponse.success("Xóa đơn kính thành công", null));
    }

    // Chức năng: Bệnh nhân/Bác sĩ lấy danh sách các đơn kính của một bệnh nhân cụ thể
    @GetMapping("/patient/{patientId}")
    public ResponseEntity<ApiResponse<List<EyeglassPrescriptionResponse>>> getPatientPrescriptions(
            @PathVariable Long patientId) {
        List<EyeglassPrescriptionResponse> responses = eyeglassPrescriptionService.getPatientPrescriptions(patientId);
        return ResponseEntity.ok(ApiResponse.success("Lấy danh sách đơn kính thành công", responses));
    }

    // Chức năng: Dược sĩ lấy danh sách các đơn kính đang chờ để phát
    @GetMapping("/pending")
    public ResponseEntity<ApiResponse<List<EyeglassPrescriptionResponse>>> getPendingPrescriptions() {
        List<EyeglassPrescriptionResponse> responses = eyeglassPrescriptionService.getPendingPrescriptions();
        return ResponseEntity.ok(ApiResponse.success("Lấy danh sách đơn kính chờ phát thành công", responses));
    }

    // Chức năng: Cập nhật trạng thái một đơn kính thành "Đã phát"
    @PatchMapping("/{id}/dispense")
    public ResponseEntity<ApiResponse<EyeglassPrescriptionResponse>> dispensePrescription(
            @PathVariable Long id) {
        EyeglassPrescriptionResponse response = eyeglassPrescriptionService.dispensePrescription(id);
        return ResponseEntity.ok(ApiResponse.success("Phát đơn kính thành công", response));
    }

    // Chức năng: Cập nhật trạng thái một đơn kính thành "Đã hủy/Bỏ qua"
    @PatchMapping("/{id}/skip")
    public ResponseEntity<ApiResponse<EyeglassPrescriptionResponse>> skipPrescription(@PathVariable Long id) {
        EyeglassPrescriptionResponse response = eyeglassPrescriptionService.skipPrescription(id);
        return ResponseEntity.ok(ApiResponse.success("Bỏ qua đơn kính thành công", response));
    }

    // Chức năng: Đơn kính đã sẵn sàng giao — dành cho Dược sĩ/Lễ tân xác nhận giao cho bệnh nhân
    @GetMapping("/ready")
    public ResponseEntity<ApiResponse<List<EyeglassPrescriptionResponse>>> getReadyPrescriptions() {
        return ResponseEntity.ok(ApiResponse.success(
                "Lấy danh sách đơn kính sẵn sàng giao thành công",
                eyeglassPrescriptionService.getReadyPrescriptions()));
    }

    // Chức năng: Lấy danh sách đơn kính đã kê cho 1 bệnh án cụ thể (dùng để hiển thị trong EMR)
    @GetMapping("/medical-record/{medicalRecordId}")
    public ResponseEntity<ApiResponse<List<EyeglassPrescriptionResponse>>> getByMedicalRecordId(
            @PathVariable Long medicalRecordId) {
        return ResponseEntity.ok(ApiResponse.success(
                "Lấy danh sách đơn kính theo bệnh án thành công",
                eyeglassPrescriptionService.getByMedicalRecordId(medicalRecordId)));
    }

    // Lấy chi tiết 1 đơn kính — dùng cho trang chi tiết gia công của Lab Technician
    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<EyeglassPrescriptionResponse>> getById(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success(
                "Lấy chi tiết đơn kính thành công", eyeglassPrescriptionService.getById(id)));
    }
}
