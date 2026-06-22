package com.ecms.controller;

import com.ecms.dto.request.AssignNurseRequest;
import com.ecms.dto.request.BookCareSessionRequest;
import com.ecms.dto.response.ApiResponse;
import com.ecms.dto.response.CareSessionResponse;
import com.ecms.dto.response.NurseResponse;
import com.ecms.service.CareSessionService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/care-sessions")
@RequiredArgsConstructor
public class CareSessionController {

    private final CareSessionService careSessionService;

    /** Đặt buổi khám — PATIENT */
    @PostMapping
    public ResponseEntity<ApiResponse<CareSessionResponse>> book(
            @Valid @RequestBody BookCareSessionRequest request,
            Authentication authentication) {
        CareSessionResponse result = careSessionService.book(request, authentication.getName());
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Đặt buổi khám thành công", result));
    }

    /** Buổi khám của bệnh nhân đang đăng nhập */
    @GetMapping("/my")
    public ResponseEntity<ApiResponse<List<CareSessionResponse>>> getMySessions(Authentication authentication) {
        return ResponseEntity.ok(ApiResponse.success(careSessionService.getMySessions(authentication.getName())));
    }

    /** Tất cả buổi khám (lọc theo ngày) — RECEPTIONIST / MANAGER / ADMIN */
    @GetMapping
    public ResponseEntity<ApiResponse<List<CareSessionResponse>>> getAll(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        return ResponseEntity.ok(ApiResponse.success(careSessionService.getAllSessions(date)));
    }

    /** Hàng đợi của điều dưỡng đang đăng nhập */
    @GetMapping("/queue")
    public ResponseEntity<ApiResponse<List<CareSessionResponse>>> getNurseQueue(Authentication authentication) {
        return ResponseEntity.ok(ApiResponse.success(careSessionService.getNurseQueue(authentication.getName())));
    }

    /** Danh sách buổi theo gói đăng ký */
    @GetMapping("/subscription/{subscriptionId}")
    public ResponseEntity<ApiResponse<List<CareSessionResponse>>> getBySubscription(@PathVariable Long subscriptionId) {
        return ResponseEntity.ok(ApiResponse.success(careSessionService.getSessionsBySubscription(subscriptionId)));
    }

    /** Phân công điều dưỡng — MANAGER */
    @PatchMapping("/{id}/assign-nurse")
    public ResponseEntity<ApiResponse<CareSessionResponse>> assignNurse(
            @PathVariable Long id,
            @Valid @RequestBody AssignNurseRequest request) {
        return ResponseEntity.ok(ApiResponse.success("Phân công điều dưỡng thành công",
                careSessionService.assignNurse(id, request)));
    }

    /** Bắt đầu thực hiện — NURSE */
    @PatchMapping("/{id}/start")
    public ResponseEntity<ApiResponse<CareSessionResponse>> start(
            @PathVariable Long id,
            Authentication authentication) {
        return ResponseEntity.ok(ApiResponse.success("Bắt đầu buổi khám",
                careSessionService.startSession(id, authentication.getName())));
    }

    /** Hoàn thành — NURSE */
    @PatchMapping("/{id}/complete")
    public ResponseEntity<ApiResponse<CareSessionResponse>> complete(
            @PathVariable Long id,
            @RequestBody(required = false) Map<String, String> body,
            Authentication authentication) {
        String notes = body != null ? body.get("nurseNotes") : null;
        return ResponseEntity.ok(ApiResponse.success("Hoàn thành buổi khám",
                careSessionService.completeSession(id, notes, authentication.getName())));
    }

    /** Check-out (trừ buổi khỏi gói) — RECEPTIONIST */
    @PatchMapping("/{id}/checkout")
    public ResponseEntity<ApiResponse<CareSessionResponse>> checkout(
            @PathVariable Long id,
            Authentication authentication) {
        return ResponseEntity.ok(ApiResponse.success("Check-out thành công",
                careSessionService.checkoutSession(id, authentication.getName())));
    }

    /** Huỷ buổi khám */
    @PatchMapping("/{id}/cancel")
    public ResponseEntity<ApiResponse<CareSessionResponse>> cancel(
            @PathVariable Long id,
            Authentication authentication) {
        return ResponseEntity.ok(ApiResponse.success("Huỷ buổi khám thành công",
                careSessionService.cancelSession(id, authentication.getName())));
    }

    /** Danh sách điều dưỡng — MANAGER */
    @GetMapping("/nurses")
    public ResponseEntity<ApiResponse<List<NurseResponse>>> getNurses() {
        return ResponseEntity.ok(ApiResponse.success(careSessionService.getAllNurses()));
    }
}
