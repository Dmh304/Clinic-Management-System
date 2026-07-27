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
 * @author  ThangNB - HE201024
 * @created 2026-07-19
 * @updated 2026-07-19
 *
 * Payroll approval API (UC-54 Approve Payroll).
 * Base URL: /api/v1/payroll
 *
 * Validate: BR-17 (Payroll Authority) — the whole controller is restricted to
 * MANAGER / ADMIN in SecurityConfig, which is where the "only a Clinic Manager
 * may approve payroll" rule is enforced.
 */
@RestController
@RequestMapping("/api/v1/payroll")
@RequiredArgsConstructor
public class PayrollController {

    private final PayrollService payrollService;
    private final UserRepository userRepository;

    /**
     * Generates or regenerates the DRAFT payroll for a period
     * (UC-54 normal flow steps 1-2).
     *
     * @param year  pay period year; defaults to the current year
     * @param month pay period month 1-12; defaults to the current month
     * @return the draft period with its lines
     *
     * Validate: BR-09 — regeneration is refused for an APPROVED period, whose
     * lines are locked.
     */
    @PostMapping("/generate")
    public ResponseEntity<ApiResponse<Map<String, Object>>> generate(
            @RequestParam(required = false) Integer year,
            @RequestParam(required = false) Integer month) {
        LocalDate today = LocalDate.now();
        int y = year != null ? year : today.getYear();
        int m = month != null ? month : today.getMonthValue();
        return ResponseEntity.ok(ApiResponse.success(payrollService.generateDraft(y, m)));
    }

    /**
     * Lists pay periods, newest first.
     *
     * @return period summaries with their status
     */
    @GetMapping("/periods")
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> periods() {
        return ResponseEntity.ok(ApiResponse.success(payrollService.listPeriods()));
    }

    /**
     * Loads one pay period together with every payroll line, for the review
     * table (UC-54 normal flow step 3).
     *
     * @param id pay period primary key
     */
    @GetMapping("/periods/{id}")
    public ResponseEntity<ApiResponse<Map<String, Object>>> period(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success(payrollService.getPeriod(id)));
    }

    /**
     * Adjusts one payroll line (UC-54 normal flow step 3).
     *
     * @param id      payroll line primary key
     * @param request overridden amounts plus the justification note
     * @return the updated line
     *
     * Validate: BR-09 — the service rejects the edit when the period is
     * already APPROVED, since its lines are locked (UC-54 POST-2).
     */
    @PatchMapping("/items/{id}")
    public ResponseEntity<ApiResponse<Map<String, Object>>> updateItem(
            @PathVariable Long id, @RequestBody PayrollItemUpdateRequest request) {
        return ResponseEntity.ok(ApiResponse.success(payrollService.updateItem(id, request)));
    }

    /**
     * Approves a pay period (UC-54 normal flow steps 4-7).
     *
     * @param userDetails authenticated principal; resolved to the approving
     *                    manager so the Audit Log entry is attributable
     * @param id          pay period primary key
     * @return the approved period
     * @throws ResourceNotFoundException if the principal has no user record
     *
     * Validate: BR-17 — the approver is taken from the JWT principal rather
     * than the request body, so the recorded approver cannot be spoofed;
     * BR-09 — approval locks every line irreversibly.
     */
    @PostMapping("/periods/{id}/approve")
    public ResponseEntity<ApiResponse<Map<String, Object>>> approve(
            @AuthenticationPrincipal UserDetails userDetails, @PathVariable Long id) {
        User actor = userRepository.findByEmail(userDetails.getUsername())
                .orElseThrow(() -> new ResourceNotFoundException("Người dùng không tồn tại"));
        return ResponseEntity.ok(ApiResponse.success(payrollService.approve(id, actor.getId())));
    }
}
