package com.ecms.controller;

import com.ecms.dto.request.DiscountCampaignRequest;
import com.ecms.dto.response.ApiResponse;
import com.ecms.dto.response.DiscountApplicationResponse;
import com.ecms.dto.response.DiscountCampaignResponse;
import com.ecms.service.DiscountCampaignService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.List;

@RestController
@RequestMapping("/api/v1/discount-campaigns")
@RequiredArgsConstructor
public class DiscountCampaignController {

    private final DiscountCampaignService discountCampaignService;

    /** Tạo chương trình giảm giá — MANAGER */
    @PostMapping
    public ResponseEntity<ApiResponse<DiscountCampaignResponse>> create(
            @Valid @RequestBody DiscountCampaignRequest request,
            Authentication authentication, HttpServletRequest httpRequest) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Tạo chương trình giảm giá thành công",
                        discountCampaignService.create(request, authentication.getName(), httpRequest.getRemoteAddr())));
    }

    /** Cập nhật — MANAGER */
    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<DiscountCampaignResponse>> update(
            @PathVariable Long id,
            @Valid @RequestBody DiscountCampaignRequest request,
            Authentication authentication, HttpServletRequest httpRequest) {
        return ResponseEntity.ok(ApiResponse.success("Cập nhật thành công",
                discountCampaignService.update(id, request, authentication.getName(), httpRequest.getRemoteAddr())));
    }

    /** Vô hiệu hoá — MANAGER */
    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> delete(
            @PathVariable Long id, Authentication authentication, HttpServletRequest httpRequest) {
        discountCampaignService.delete(id, authentication.getName(), httpRequest.getRemoteAddr());
        return ResponseEntity.ok(ApiResponse.success("Đã vô hiệu hoá chương trình", null));
    }

    /** Chi tiết */
    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<DiscountCampaignResponse>> getById(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success(discountCampaignService.getById(id)));
    }

    /** Tất cả — MANAGER / RECEPTIONIST */
    @GetMapping
    public ResponseEntity<ApiResponse<List<DiscountCampaignResponse>>> getAll() {
        return ResponseEntity.ok(ApiResponse.success(discountCampaignService.getAll()));
    }

    /** Chỉ các campaign đang hoạt động — public (dùng khi mua gói) */
    @GetMapping("/active")
    public ResponseEntity<ApiResponse<List<DiscountCampaignResponse>>> getActive() {
        return ResponseEntity.ok(ApiResponse.success(discountCampaignService.getActive()));
    }

    /** Manager bấm gửi thủ công — broadcast email + thông báo trong app cho toàn bộ bệnh nhân
     *  có email trong hệ thống. */
    @PostMapping("/{id}/broadcast")
    public ResponseEntity<ApiResponse<java.util.Map<String, Integer>>> broadcast(
            @PathVariable Long id, Authentication authentication, HttpServletRequest httpRequest) {
        java.util.Map<String, Integer> result = discountCampaignService.broadcastAnnouncement(
                id, authentication.getName(), httpRequest.getRemoteAddr());
        return ResponseEntity.ok(ApiResponse.success(
                "Đã gửi " + result.get("sentCount") + "/" + result.get("totalPatients") + " email", result));
    }

    /** Xem trước mức giảm của 1 mã cho 1 số tiền — không tăng lượt dùng. Dùng ở mọi màn hình
     *  checkout (hoá đơn khám, đăng ký dịch vụ...) để hiển thị số tiền giảm trước khi xác nhận. */
    @GetMapping("/quote")
    public ResponseEntity<ApiResponse<DiscountApplicationResponse>> quote(
            @RequestParam String code, @RequestParam BigDecimal amount) {
        return ResponseEntity.ok(ApiResponse.success(discountCampaignService.quote(code, amount)));
    }
}
