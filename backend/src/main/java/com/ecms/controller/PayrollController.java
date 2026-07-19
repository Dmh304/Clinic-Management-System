package com.ecms.controller;

import com.ecms.dto.request.PayrollItemUpdateRequest;
import com.ecms.dto.response.ApiResponse;
import com.ecms.entity.User;
import com.ecms.exception.ResourceNotFoundException;
import com.ecms.repository.UserRepository;
import com.ecms.service.PayrollService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

/**
 * UC-54: Duyệt bảng lương (chỉ MANAGER/ADMIN — cấu hình ở SecurityConfig).
 * Base URL: /api/v1/payroll
 */
@RestController
@RequestMapping("/api/v1/payroll")
@RequiredArgsConstructor
public class PayrollController {

    private final PayrollService payrollService;
    private final UserRepository userRepository;

    // Sinh/soạn lại bảng lương nháp cho một kỳ (mặc định tháng hiện tại)
    @PostMapping("/generate")
    public ResponseEntity<ApiResponse<Map<String, Object>>> generate(
            @RequestParam(required = false) Integer year,
            @RequestParam(required = false) Integer month) {
        LocalDate today = LocalDate.now();
        int y = year != null ? year : today.getYear();
        int m = month != null ? month : today.getMonthValue();
        return ResponseEntity.ok(ApiResponse.success(payrollService.generateDraft(y, m)));
    }

    // Danh sách kỳ lương
    @GetMapping("/periods")
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> periods() {
        return ResponseEntity.ok(ApiResponse.success(payrollService.listPeriods()));
    }

    // Chi tiết kỳ lương kèm dòng lương
    @GetMapping("/periods/{id}")
    public ResponseEntity<ApiResponse<Map<String, Object>>> period(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success(payrollService.getPeriod(id)));
    }

    // Điều chỉnh một dòng lương
    @PatchMapping("/items/{id}")
    public ResponseEntity<ApiResponse<Map<String, Object>>> updateItem(
            @PathVariable Long id, @RequestBody PayrollItemUpdateRequest request) {
        return ResponseEntity.ok(ApiResponse.success(payrollService.updateItem(id, request)));
    }

    // Duyệt bảng lương của một kỳ
    @PostMapping("/periods/{id}/approve")
    public ResponseEntity<ApiResponse<Map<String, Object>>> approve(
            @AuthenticationPrincipal UserDetails userDetails, @PathVariable Long id) {
        User actor = userRepository.findByEmail(userDetails.getUsername())
                .orElseThrow(() -> new ResourceNotFoundException("Người dùng không tồn tại"));
        return ResponseEntity.ok(ApiResponse.success(payrollService.approve(id, actor.getId())));
    }
}
