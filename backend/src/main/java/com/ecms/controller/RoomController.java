/**
 * Controller UC-55: Manage Room Catalogue & Service Mapping.
 * Toàn bộ endpoint dưới đây chỉ dành cho Clinic Manager.
 */
package com.ecms.controller;

import com.ecms.dto.request.RoomRequest;
import com.ecms.dto.response.ApiResponse;
import com.ecms.dto.response.RoomResponse;
import com.ecms.entity.RoomCategory;
import com.ecms.service.RoomService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/rooms")
@RequiredArgsConstructor
@PreAuthorize("hasAnyRole('MANAGER', 'ADMIN')")
public class RoomController {

    private final RoomService roomService;

    @PostMapping
    public ResponseEntity<ApiResponse<RoomResponse>> createRoom(@RequestBody RoomRequest request) {
        return ResponseEntity.ok(ApiResponse.success(roomService.createRoom(request)));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<RoomResponse>> updateRoom(
            @PathVariable Long id,
            @RequestBody RoomRequest request) {
        return ResponseEntity.ok(ApiResponse.success(roomService.updateRoom(id, request)));
    }

    /** ALT-1 UC-55: deactivate (soft) thay vì xoá cứng — BR-09. */
    @PutMapping("/{id}/deactivate")
    public ResponseEntity<ApiResponse<RoomResponse>> deactivateRoom(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success(roomService.deactivateRoom(id)));
    }

    @PutMapping("/{id}/reactivate")
    public ResponseEntity<ApiResponse<RoomResponse>> reactivateRoom(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success(roomService.reactivateRoom(id)));
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<RoomResponse>>> getAllRooms(
            @RequestParam(defaultValue = "false") boolean includeInactive) {
        return ResponseEntity.ok(ApiResponse.success(roomService.getAllRooms(includeInactive)));
    }

    @GetMapping("/category/{category}")
    public ResponseEntity<ApiResponse<List<RoomResponse>>> getRoomsByCategory(
            @PathVariable RoomCategory category) {
        return ResponseEntity.ok(ApiResponse.success(roomService.getRoomsByCategory(category)));
    }

    /** Phòng đang active phục vụ 1 dịch vụ/loại xét nghiệm cụ thể — dùng để resolve phòng lúc đặt lịch. */
    @GetMapping("/by-service/{serviceId}")
    public ResponseEntity<ApiResponse<List<RoomResponse>>> getRoomsByService(@PathVariable Long serviceId) {
        return ResponseEntity.ok(ApiResponse.success(roomService.getRoomsByService(serviceId)));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<RoomResponse>> getRoomById(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success(roomService.getRoomById(id)));
    }
}