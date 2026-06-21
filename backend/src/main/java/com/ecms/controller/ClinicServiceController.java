package com.ecms.controller;

import com.ecms.dto.request.ServicePackageRequest;
import com.ecms.dto.request.ServiceRegistrationRequest;
import com.ecms.dto.response.*;
import com.ecms.service.ClinicServiceService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/services")
@RequiredArgsConstructor
public class ClinicServiceController {

    private final ClinicServiceService clinicServiceService;

    /** Danh sách tất cả dịch vụ đang hoạt động — public; lọc theo type (CLINICAL/CARE) nếu có */
    @GetMapping
    public ResponseEntity<ApiResponse<List<ClinicServiceResponse>>> getAllServices(
            @RequestParam(required = false) String type) {
        return ResponseEntity.ok(ApiResponse.success(clinicServiceService.getAllServices(type)));
    }

    /** Danh mục dịch vụ kèm các gói con — public */
    @GetMapping("/categories")
    public ResponseEntity<ApiResponse<List<ServiceCategoryResponse>>> getCategoriesWithServices() {
        return ResponseEntity.ok(ApiResponse.success(clinicServiceService.getCategoriesWithServices()));
    }

    /** Chi tiết một dịch vụ — public */
    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<ClinicServiceResponse>> getServiceById(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success(clinicServiceService.getServiceById(id)));
    }

    /** Đăng ký dịch vụ — PATIENT tự đăng ký, RECEPTIONIST đăng ký thay bệnh nhân */
    @PostMapping("/register")
    public ResponseEntity<ApiResponse<ServiceRegistrationResponse>> register(
            @Valid @RequestBody ServiceRegistrationRequest request,
            Authentication authentication) {
        ServiceRegistrationResponse result = clinicServiceService.register(request, authentication.getName());
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Đăng ký dịch vụ thành công", result));
    }

    /** Tất cả đăng ký — RECEPTIONIST / ADMIN */
    @GetMapping("/registrations")
    public ResponseEntity<ApiResponse<List<ServiceRegistrationResponse>>> getAllRegistrations() {
        return ResponseEntity.ok(ApiResponse.success(clinicServiceService.getAllRegistrations()));
    }

    /** Đăng ký của bệnh nhân đang đăng nhập */
    @GetMapping("/my-registrations")
    public ResponseEntity<ApiResponse<List<ServiceRegistrationResponse>>> getMyRegistrations(
            Authentication authentication) {
        return ResponseEntity.ok(ApiResponse.success(
                clinicServiceService.getMyRegistrations(authentication.getName())));
    }

    // ── Manager CRUD ──────────────────────────────────────────────

    /** Tạo gói dịch vụ mới — MANAGER */
    @PostMapping("/packages")
    public ResponseEntity<ApiResponse<ClinicServiceResponse>> createPackage(
            @Valid @RequestBody ServicePackageRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Tạo gói dịch vụ thành công",
                        clinicServiceService.createPackage(request)));
    }

    /** Cập nhật gói dịch vụ — MANAGER */
    @PutMapping("/packages/{id}")
    public ResponseEntity<ApiResponse<ClinicServiceResponse>> updatePackage(
            @PathVariable Long id,
            @Valid @RequestBody ServicePackageRequest request) {
        return ResponseEntity.ok(ApiResponse.success("Cập nhật gói dịch vụ thành công",
                clinicServiceService.updatePackage(id, request)));
    }

    /** Xoá mềm (ẩn) gói dịch vụ — MANAGER */
    @DeleteMapping("/packages/{id}")
    public ResponseEntity<ApiResponse<Void>> deletePackage(@PathVariable Long id) {
        clinicServiceService.deletePackage(id);
        return ResponseEntity.ok(ApiResponse.success("Đã ẩn gói dịch vụ", null));
    }

    /** Bật/tắt hiển thị — MANAGER */
    @PatchMapping("/packages/{id}/toggle")
    public ResponseEntity<ApiResponse<ClinicServiceResponse>> toggleActive(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success(clinicServiceService.toggleActive(id)));
    }
}
