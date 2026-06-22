package com.ecms.controller;

import com.ecms.dto.request.PurchaseServiceRequest;
import com.ecms.dto.response.ApiResponse;
import com.ecms.dto.response.DiscountCampaignResponse;
import com.ecms.dto.response.ServiceSubscriptionResponse;
import com.ecms.service.ServiceSubscriptionService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.List;

@RestController
@RequestMapping("/api/v1/subscriptions")
@RequiredArgsConstructor
public class ServiceSubscriptionController {

    private final ServiceSubscriptionService subscriptionService;

    /** Mua gói dịch vụ — PATIENT / RECEPTIONIST / MANAGER */
    @PostMapping
    public ResponseEntity<ApiResponse<ServiceSubscriptionResponse>> purchase(
            @Valid @RequestBody PurchaseServiceRequest request,
            Authentication authentication) {
        ServiceSubscriptionResponse result = subscriptionService.purchase(request, authentication.getName());
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Đăng ký gói dịch vụ thành công", result));
    }

    /** Gói của bệnh nhân đang đăng nhập */
    @GetMapping("/my")
    public ResponseEntity<ApiResponse<List<ServiceSubscriptionResponse>>> getMySubscriptions(Authentication authentication) {
        return ResponseEntity.ok(ApiResponse.success(subscriptionService.getMySubscriptions(authentication.getName())));
    }

    /** Tất cả gói — RECEPTIONIST / MANAGER / ADMIN */
    @GetMapping
    public ResponseEntity<ApiResponse<List<ServiceSubscriptionResponse>>> getAll() {
        return ResponseEntity.ok(ApiResponse.success(subscriptionService.getAllSubscriptions()));
    }

    /** Gói của một bệnh nhân cụ thể */
    @GetMapping("/patient/{patientId}")
    public ResponseEntity<ApiResponse<List<ServiceSubscriptionResponse>>> getByPatient(@PathVariable Long patientId) {
        return ResponseEntity.ok(ApiResponse.success(subscriptionService.getSubscriptionsByPatient(patientId)));
    }

    /** Chi tiết một gói */
    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<ServiceSubscriptionResponse>> getById(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success(subscriptionService.getById(id)));
    }

    /** Huỷ gói */
    @PatchMapping("/{id}/cancel")
    public ResponseEntity<ApiResponse<Void>> cancel(@PathVariable Long id, Authentication authentication) {
        subscriptionService.cancelSubscription(id, authentication.getName());
        return ResponseEntity.ok(ApiResponse.success("Huỷ gói dịch vụ thành công", null));
    }

    /** Kiểm tra mã giảm giá */
    @GetMapping("/validate-discount")
    public ResponseEntity<ApiResponse<DiscountCampaignResponse>> validateDiscount(
            @RequestParam String code,
            @RequestParam(required = false) BigDecimal amount) {
        return ResponseEntity.ok(ApiResponse.success(subscriptionService.validateDiscountCode(code, amount)));
    }
}
