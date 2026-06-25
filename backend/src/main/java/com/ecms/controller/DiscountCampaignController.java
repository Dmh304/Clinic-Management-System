package com.ecms.controller;

import com.ecms.dto.request.DiscountCampaignRequest;
import com.ecms.dto.response.ApiResponse;
import com.ecms.dto.response.DiscountCampaignResponse;
import com.ecms.service.DiscountCampaignService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/discount-campaigns")
@RequiredArgsConstructor
public class DiscountCampaignController {

    private final DiscountCampaignService discountCampaignService;

    /** Tạo chương trình giảm giá — MANAGER */
    @PostMapping
    public ResponseEntity<ApiResponse<DiscountCampaignResponse>> create(
            @Valid @RequestBody DiscountCampaignRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Tạo chương trình giảm giá thành công",
                        discountCampaignService.create(request)));
    }

    /** Cập nhật — MANAGER */
    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<DiscountCampaignResponse>> update(
            @PathVariable Long id,
            @Valid @RequestBody DiscountCampaignRequest request) {
        return ResponseEntity.ok(ApiResponse.success("Cập nhật thành công",
                discountCampaignService.update(id, request)));
    }

    /** Vô hiệu hoá — MANAGER */
    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> delete(@PathVariable Long id) {
        discountCampaignService.delete(id);
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
}
