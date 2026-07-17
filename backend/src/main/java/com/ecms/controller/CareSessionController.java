package com.ecms.controller;

import com.ecms.dto.request.AssignNurseRequest;
import com.ecms.dto.request.BookCareSessionRequest;
import com.ecms.dto.response.ApiResponse;
import com.ecms.dto.response.AutoAssignResult;
import com.ecms.dto.response.CareSessionResponse;
import com.ecms.dto.response.NurseResponse;
import com.ecms.service.CareSessionService;
import jakarta.servlet.http.HttpServletRequest;
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

    /** Hàng đợi của điều dưỡng đang đăng nhập — truyền date để xem ngày trước/sau (mọi trạng thái);
     *  không truyền date thì trả toàn bộ buổi đang chờ (BOOKED) bất kể ngày. */
    @GetMapping("/queue")
    public ResponseEntity<ApiResponse<List<CareSessionResponse>>> getNurseQueue(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date,
            Authentication authentication) {
        return ResponseEntity.ok(ApiResponse.success(careSessionService.getNurseQueue(authentication.getName(), date)));
    }

    /** Chi tiết 1 buổi khám theo id — nurse chỉ xem được buổi của mình, patient chỉ xem được buổi của mình */
    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<CareSessionResponse>> getById(
            @PathVariable Long id, Authentication authentication) {
        return ResponseEntity.ok(ApiResponse.success(careSessionService.getById(id, authentication.getName())));
    }

    /** Danh sách buổi theo gói đăng ký */
    @GetMapping("/subscription/{subscriptionId}")
    public ResponseEntity<ApiResponse<List<CareSessionResponse>>> getBySubscription(@PathVariable Long subscriptionId) {
        return ResponseEntity.ok(ApiResponse.success(careSessionService.getSessionsBySubscription(subscriptionId)));
    }

    /** Phân công điều dưỡng — MANAGER. request.override=true để vẫn phân công dù đã đủ sức chứa (UC-19 E-2). */
    @PatchMapping("/{id}/assign-nurse")
    public ResponseEntity<ApiResponse<CareSessionResponse>> assignNurse(
            @PathVariable Long id,
            @Valid @RequestBody AssignNurseRequest request,
            Authentication authentication, HttpServletRequest httpRequest) {
        return ResponseEntity.ok(ApiResponse.success("Phân công điều dưỡng thành công",
                careSessionService.assignNurse(id, request, authentication.getName(), httpRequest.getRemoteAddr())));
    }

    /** UC-19 ALT-1: tự động phân công mọi buổi BOOKED chưa có điều dưỡng trong ngày — MANAGER */
    @PostMapping("/auto-assign")
    public ResponseEntity<ApiResponse<AutoAssignResult>> autoAssignRemaining(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date,
            Authentication authentication, HttpServletRequest httpRequest) {
        AutoAssignResult result = careSessionService.autoAssignRemaining(date, authentication.getName(), httpRequest.getRemoteAddr());
        return ResponseEntity.ok(ApiResponse.success(
                "Đã tự động phân công " + result.getAssignedCount() + " buổi"
                        + (result.getStillUnassignedCount() > 0
                                ? ", còn " + result.getStillUnassignedCount() + " buổi chưa phân công được (không đủ điều dưỡng)"
                                : ""),
                result));
    }

    /** Check-in tại quầy lễ tân — RECEPTIONIST. Bắt buộc trước khi điều dưỡng bắt đầu buổi khám. */
    @PatchMapping("/{id}/check-in")
    public ResponseEntity<ApiResponse<CareSessionResponse>> checkIn(
            @PathVariable Long id,
            Authentication authentication) {
        return ResponseEntity.ok(ApiResponse.success("Check-in thành công",
                careSessionService.checkInSession(id, authentication.getName())));
    }

    /** Bắt đầu thực hiện — NURSE */
    @PatchMapping("/{id}/start")
    public ResponseEntity<ApiResponse<CareSessionResponse>> start(
            @PathVariable Long id,
            Authentication authentication) {
        return ResponseEntity.ok(ApiResponse.success("Bắt đầu buổi khám",
                careSessionService.startSession(id, authentication.getName())));
    }

    /** Hoàn thành — NURSE. body.isIncident=true để đánh dấu sự cố (UC-32 ALT-1), báo Manager xem xét. */
    @PatchMapping("/{id}/complete")
    public ResponseEntity<ApiResponse<CareSessionResponse>> complete(
            @PathVariable Long id,
            @RequestBody(required = false) Map<String, Object> body,
            Authentication authentication) {
        String notes = body != null ? (String) body.get("nurseNotes") : null;
        Boolean isIncident = body != null ? Boolean.valueOf(String.valueOf(body.get("isIncident"))) : false;
        return ResponseEntity.ok(ApiResponse.success("Hoàn thành buổi khám",
                careSessionService.completeSession(id, notes, isIncident, authentication.getName())));
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
