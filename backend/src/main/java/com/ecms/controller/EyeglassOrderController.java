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
@RequestMapping("/api/eyeglass-orders")
@RequiredArgsConstructor
public class EyeglassOrderController {

    private final EyeglassOrderService eyeglassOrderService;

    @PostMapping
    public ResponseEntity<EyeglassOrderResponse> createOrder(@Valid @RequestBody EyeglassOrderRequest request) {
        return ResponseEntity.ok(eyeglassOrderService.createOrder(request));
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

    @PutMapping("/{id}/pickup")
    public ResponseEntity<EyeglassOrderResponse> dispenseOrder(@PathVariable Long id, Authentication authentication) {
        String staffEmail = authentication.getName();
        return ResponseEntity.ok(eyeglassOrderService.dispenseOrder(id, staffEmail));
    }
}
