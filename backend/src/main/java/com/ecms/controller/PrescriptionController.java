//Author: DucTKH - HE204463
//Created: 2026-06-01
//Last Update: 2026-07-21
// Controller xử lý Đơn thuốc (Prescription). Hỗ trợ UC-29 (Bác sĩ kê đơn), UC-39 (Dược sĩ phát thuốc), và UC-45 (Bệnh nhân xem đơn).
package com.ecms.controller;

import com.ecms.dto.request.PrescriptionRequest;
import com.ecms.dto.request.DispenseRequest;
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

    // DucTKH: Bác sĩ tạo đơn thuốc mới (UC-29). Yêu cầu bác sĩ có quyền kê đơn (BR-06) và cảnh báo dị ứng (BR-24).
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

    // DucTKH: Dược sĩ xác nhận phát thuốc (UC-39). Lưu trữ lịch sử người phát.
    @PatchMapping("/{id}/dispense")
    public ResponseEntity<ApiResponse<PrescriptionResponse>> dispensePrescription(
            @PathVariable Long id,
            @RequestBody(required = false) @Valid DispenseRequest request,
            Authentication authentication) {
        String dispenserName = authentication != null ? authentication.getName() : "Unknown";
        PrescriptionResponse response = prescriptionService.dispensePrescription(id, request, dispenserName);
        return ResponseEntity.ok(ApiResponse.success("Phát thuốc thành công", response));
    }

    // API endpoint: Cập nhật trạng thái một đơn thuốc thành "Đã hủy/Bỏ qua"
    @PatchMapping("/{id}/skip")
    public ResponseEntity<ApiResponse<PrescriptionResponse>> skipPrescription(@PathVariable Long id) {
        // DucTKH: Gọi tầng Service để đánh dấu đơn thuốc bị bỏ qua
        PrescriptionResponse response = prescriptionService.skipPrescription(id);
        return ResponseEntity.ok(ApiResponse.success("Bỏ qua đơn thuốc thành công", response));
    }

    // API endpoint: Xóa đơn thuốc (chỉ xóa khi đang PENDING)
    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> deletePrescription(@PathVariable Long id) {
        // DucTKH: Gọi tầng Service để xóa đơn thuốc khỏi cơ sở dữ liệu
        prescriptionService.deletePrescription(id);
        return ResponseEntity.ok(ApiResponse.success("Xóa đơn thuốc thành công", null));
    }

    // Xuất file PDF Đơn thuốc
    @GetMapping("/{id}/pdf")
    public ResponseEntity<byte[]> downloadPdf(@PathVariable Long id, @RequestParam(defaultValue = "false") boolean hideSignature) {
        byte[] pdf = prescriptionService.generatePrescriptionPdf(id, hideSignature);
        String filename = "don-thuoc-" + id + ".pdf";
        return ResponseEntity.ok()
                .contentType(org.springframework.http.MediaType.APPLICATION_PDF)
                .header(org.springframework.http.HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"" + filename + "\"")
                .body(pdf);
    }
}
