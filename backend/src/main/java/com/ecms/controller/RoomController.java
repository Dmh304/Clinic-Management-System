// UC-58: Manage Room Catalogue & Service Mapping
package com.ecms.controller;

import com.ecms.dto.request.RoomRequest;
import com.ecms.dto.response.ApiResponse;
import com.ecms.dto.response.RoomResponse;
import com.ecms.service.RoomCatalogService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/rooms")
@RequiredArgsConstructor
public class RoomController {

    private final RoomCatalogService roomCatalogService;

    /** Tạo phòng mới — MANAGER */
    @PostMapping
    public ResponseEntity<ApiResponse<RoomResponse>> create(
            @Valid @RequestBody RoomRequest request,
            Authentication authentication, HttpServletRequest httpRequest) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Tạo phòng thành công",
                        roomCatalogService.create(request, authentication.getName(), httpRequest.getRemoteAddr())));
    }

    /** Cập nhật phòng — MANAGER */
    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<RoomResponse>> update(
            @PathVariable Long id,
            @Valid @RequestBody RoomRequest request,
            Authentication authentication, HttpServletRequest httpRequest) {
        return ResponseEntity.ok(ApiResponse.success("Cập nhật phòng thành công",
                roomCatalogService.update(id, request, authentication.getName(), httpRequest.getRemoteAddr())));
    }

    /** ALT-1: vô hiệu hoá phòng — MANAGER */
    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> deactivate(
            @PathVariable Long id, Authentication authentication, HttpServletRequest httpRequest) {
        roomCatalogService.deactivate(id, authentication.getName(), httpRequest.getRemoteAddr());
        return ResponseEntity.ok(ApiResponse.success("Đã vô hiệu hoá phòng", null));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<RoomResponse>> getById(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success(roomCatalogService.getById(id)));
    }

    /** Toàn bộ danh mục phòng (kể cả đã vô hiệu hoá) — MANAGER */
    @GetMapping
    public ResponseEntity<ApiResponse<List<RoomResponse>>> getAll() {
        return ResponseEntity.ok(ApiResponse.success(roomCatalogService.getAll()));
    }

    /** Phòng đang active theo loại (DOCTOR/NURSE/LAB) — dùng khi chọn phòng ở UC-59 */
    @GetMapping("/by-type/{roomType}")
    public ResponseEntity<ApiResponse<List<RoomResponse>>> getActiveByType(@PathVariable String roomType) {
        return ResponseEntity.ok(ApiResponse.success(roomCatalogService.getActiveByType(roomType)));
    }

    /** Phòng đang active phục vụ 1 dịch vụ/loại xét nghiệm cụ thể — dùng để resolve phòng lúc đặt lịch */
    @GetMapping("/by-service/{serviceId}")
    public ResponseEntity<ApiResponse<List<RoomResponse>>> getActiveByService(@PathVariable Long serviceId) {
        return ResponseEntity.ok(ApiResponse.success(roomCatalogService.getActiveByService(serviceId)));
    }
}
