//Author: DucTKH - HE204463
//Created: 2026-07-12
//Last Update: 2026-07-21

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

/**
 * Controller xử lý luồng đặt kính (Eyeglass Order).
 * Phục vụ UC-42 (Patient order) và UC-25 (Receptionist quản lý).
 */
@RestController
@RequestMapping("/api/v1/eyeglass-orders")
@RequiredArgsConstructor
public class EyeglassOrderController {

    private final EyeglassOrderService eyeglassOrderService;

    // API tạo đơn kính mới (UC-42). Yêu cầu đơn kính đã được phát hành (BR-06).
    @PostMapping
    public ResponseEntity<EyeglassOrderResponse> createOrder(@Valid @RequestBody EyeglassOrderRequest request,
            Authentication authentication) {
        return ResponseEntity.ok(eyeglassOrderService.createOrder(request, authentication));
    }

    // Lấy chi tiết một đơn kính theo ID
    @GetMapping("/{id}")
    public ResponseEntity<EyeglassOrderResponse> getOrderById(@PathVariable Long id) {
        return ResponseEntity.ok(eyeglassOrderService.getOrderById(id));
    }

    // Lấy danh sách đơn kính của một bệnh nhân cụ thể
    @GetMapping("/patient/{patientId}")
    public ResponseEntity<List<EyeglassOrderResponse>> getOrdersByPatient(@PathVariable Long patientId) {
        return ResponseEntity.ok(eyeglassOrderService.getOrdersByPatient(patientId));
    }

    // Lễ tân lấy danh sách các đơn kính đang chờ xử lý (UC-25)
    @GetMapping("/pending")
    public ResponseEntity<List<EyeglassOrderResponse>> getPendingOrders() {
        return ResponseEntity.ok(eyeglassOrderService.getPendingOrders());
    }

    // Lễ tân xác nhận đơn kính (chuyển sang CONFIRMED) sau khi đã thu tiền cọc
    // (BR-28)
    @PatchMapping("/{id}/confirm")
    public ResponseEntity<EyeglassOrderResponse> confirmOrderOnline(@PathVariable Long id) {
        return ResponseEntity.ok(eyeglassOrderService.confirmOrderOnline(id));
    }

        pub

         return ResponseEntity.ok(eyeglassOrderService.updateOrder(id, request));
    // 
        } 

    @PatchMapping("/{id}/cancel")
    public ResponseEntity<Void> cancelOrder(@PathVariable Long id, @RequestBody java.util.Map<String, String> payload) {
        String cancelReason = payload.get("cancelReason");
            retu

    

    @PutMapping("/{id}/pickup")
        pubic Response     String staffEmail = authe

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
