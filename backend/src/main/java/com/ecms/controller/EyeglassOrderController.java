//Author: DucTKH - HE204463
//Created: 2026-07-12
//Last Update: 2026-07-25

package com.ecms.controller;

import com.ecms.dto.request.EyeglassOrderRequest;
import com.ecms.dto.response.EyeglassOrderResponse;
import com.ecms.dto.response.ApiResponse;
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

    // Chức năng: Bệnh nhân/Lễ tân tạo đơn đặt kính mới (UC-42)
    // Ràng buộc: Yêu cầu đơn kính phải hợp lệ và chưa được đặt (BR-06)
    @PostMapping
    public ResponseEntity<ApiResponse<EyeglassOrderResponse>> createOrder(@Valid @RequestBody EyeglassOrderRequest request, Authentication authentication) {
        return ResponseEntity.ok(ApiResponse.success("Tạo đơn kính thành công", eyeglassOrderService.createOrder(request, authentication)));
    }

    // Chức năng: Lấy chi tiết một đơn kính theo ID
    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<EyeglassOrderResponse>> getOrderById(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success("Lấy thông tin đơn kính thành công", eyeglassOrderService.getOrderById(id)));
    }

    // Chức năng: Lấy danh sách toàn bộ đơn kính của một bệnh nhân cụ thể
    @GetMapping("/patient/{patientId}")
    public ResponseEntity<ApiResponse<List<EyeglassOrderResponse>>> getOrdersByPatient(@PathVariable Long patientId) {
        return ResponseEntity.ok(ApiResponse.success("Lấy danh sách đơn kính thành công", eyeglassOrderService.getOrdersByPatient(patientId)));
    }

    // Chức năng: Lấy danh sách tất cả các đơn đặt kính (dùng cho Lễ tân)
    @GetMapping
    public ResponseEntity<ApiResponse<List<EyeglassOrderResponse>>> getAllOrders() {
        return ResponseEntity.ok(ApiResponse.success("Lấy danh sách đơn kính thành công", eyeglassOrderService.getAllOrders()));
    }

    // Chức năng: Lễ tân lấy danh sách các đơn đặt kính đang chờ xử lý (UC-25)
    @GetMapping("/pending")
    public ResponseEntity<ApiResponse<List<EyeglassOrderResponse>>> getPendingOrders() {
        return ResponseEntity.ok(ApiResponse.success("Lấy danh sách đơn kính đang chờ thành công", eyeglassOrderService.getPendingOrders()));
    }

    // Chức năng: Lễ tân xác nhận đơn đặt kính sang trạng thái CONFIRMED (BR-28)
    @PatchMapping("/{id}/confirm")
    public ResponseEntity<ApiResponse<EyeglassOrderResponse>> confirmOrderOnline(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success("Xác nhận đơn kính thành công", eyeglassOrderService.confirmOrderOnline(id)));
    }
    
    // Chức năng: Cập nhật thông tin gọng/tròng của đơn kính
    // Ràng buộc: Chỉ được phép cập nhật khi đơn ở trạng thái PENDING (BR-29) và phải tính lại giá (BR-30)
    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<EyeglassOrderResponse>> updateOrder(@PathVariable Long id, @Valid @RequestBody EyeglassOrderRequest request) {
        return ResponseEntity.ok(ApiResponse.success("Cập nhật đơn kính thành công", eyeglassOrderService.updateOrder(id, request)));
    }
    
    // Chức năng: Hủy đơn đặt kính
    // Ràng buộc: Bắt buộc phải cung cấp lý do hủy (BR-31)
    @PatchMapping("/{id}/cancel")
    public ResponseEntity<ApiResponse<Void>> cancelOrder(@PathVariable Long id, @RequestBody java.util.Map<String, String> payload) {
        String cancelReason = payload.get("cancelReason");
        eyeglassOrderService.cancelOrder(id, cancelReason);
        return ResponseEntity.ok(ApiResponse.success("Hủy đơn kính thành công", null));
    }

    // Chức năng: Giao kính cho bệnh nhân và xác nhận hoàn tất
    @PutMapping("/{id}/pickup")
    public ResponseEntity<ApiResponse<EyeglassOrderResponse>> dispenseOrder(@PathVariable Long id, Authentication authentication) {
        String staffEmail = authentication.getName();
        return ResponseEntity.ok(ApiResponse.success("Giao kính thành công", eyeglassOrderService.dispenseOrder(id, staffEmail)));
    }
}
