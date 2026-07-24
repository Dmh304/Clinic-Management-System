package com.ecms.controller;

import com.ecms.dto.request.EyeglassOrderRequest;
import com.ecms.dto.response.EyeglassOrderResponse;
import com.ecms.service.EyeglassOrderService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/eyeglass-orders")
@RequiredArgsConstructor
public class EyeglassOrderController {

    private final EyeglassOrderService eyeglassOrderService;

    @PostMapping
    public ResponseEntity<EyeglassOrderResponse> createOrder(@Valid @RequestBody EyeglassOrderRequest request,
            Authentication authentication) {
        return ResponseEntity.ok(eyeglassOrderService.createOrder(request, authentication));
    }

    @GetMapping("/{id}")
    public ResponseEntity<EyeglassOrderResponse> getOrderById(@PathVariable Long id) {
        return ResponseEntity.ok(eyeglassOrderService.getOrderById(id));
    }

    @GetMapping("/patient/{patientId}")
    public ResponseEntity<List<EyeglassOrderResponse>> getOrdersByPatient(@PathVariable Long patientId) {
        return ResponseEntity.ok(eyeglassOrderService.getOrdersByPatient(patientId));
    }

    @GetMapping("/pending")
    public ResponseEntity<List<EyeglassOrderResponse>> getPendingOrders() {
        return ResponseEntity.ok(eyeglassOrderService.getPendingOrders());
    }

    @PatchMapping("/{id}/confirm")
    public ResponseEntity<EyeglassOrderResponse> confirmOrderOnline(@PathVariable Long id) {
        return ResponseEntity.ok(eyeglassOrderService.confirmOrderOnline(id));
    }

    @PutMapping("/{id}")
    public ResponseEntity<EyeglassOrderResponse> updateOrder(@PathVariable Long id,
            @Valid @RequestBody EyeglassOrderRequest request) {
        return ResponseEntity.ok(eyeglassOrderService.updateOrder(id, request));
    }

    @PatchMapping("/{id}/cancel")
    public ResponseEntity<Void> cancelOrder(@PathVariable Long id, @RequestBody java.util.Map<String, String> payload) {
        String cancelReason = payload.get("cancelReason");
        eyeglassOrderService.cancelOrder(id, cancelReason);
        return ResponseEntity.ok().build();
    }

    @PutMapping("/{id}/pickup")
    public ResponseEntity<EyeglassOrderResponse> dispenseOrder(@PathVariable Long id, Authentication authentication) {
        String staffEmail = authentication.getName();
        return ResponseEntity.ok(eyeglassOrderService.dispenseOrder(id, staffEmail));
    }

    @GetMapping("/fabrication-queue")
    public ResponseEntity<ApiResponse<List<EyeglassOrderResponse>>> getFabricationQueue() {
        return ResponseEntity.ok(ApiResponse.success(
                "Lấy hàng đợi gia công kính thành công", eyeglassOrderService.getFabricationQueue()));
    }

    @PatchMapping("/{id}/start-fabrication")
    public ResponseEntity<ApiResponse<EyeglassOrderResponse>> startFabrication(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success(
                "Đã bắt đầu gia công đơn kính", eyeglassOrderService.startFabrication(id)));
    }

    @PatchMapping("/{id}/complete-fabrication")
    public ResponseEntity<ApiResponse<EyeglassOrderResponse>> completeFabrication(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success(
                "Đã hoàn tất gia công đơn kính", eyeglassOrderService.completeFabrication(id)));
    }
}
