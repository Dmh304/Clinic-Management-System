/**
 * Controller UC-56: Manage Staff Room Roster.
 *
 * /roster/**  — chỉ Clinic Manager (phân trực phòng).
 * /resolve    — mở cho các actor cần tra cứu phòng đã resolve của 1 nhân sự
 *               (Receptionist lúc check-in, Doctor lúc xem lịch...) nhưng
 *               KHÔNG cho phép ai chọn/đổi phòng qua endpoint này — chỉ đọc.
 */
package com.ecms.controller;

import com.ecms.dto.request.StaffRoomAssignmentRequest;
import com.ecms.dto.response.ApiResponse;
import com.ecms.dto.response.RoomResolutionResponse;
import com.ecms.dto.response.StaffRoomAssignmentResponse;
import com.ecms.entity.StaffType;
import com.ecms.service.StaffRoomAssignmentService;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/v1/room-roster")
@RequiredArgsConstructor
public class StaffRoomAssignmentController {

    private final StaffRoomAssignmentService staffRoomAssignmentService;
    private final com.ecms.repository.UserRepository userRepository;

    /**
     * Normal Flow bước 3-4 UC-56: phân/đổi phòng cho 1 nhân sự.
     */
    @PostMapping
    @PreAuthorize("hasAnyRole('MANAGER', 'ADMIN')")
    public ResponseEntity<ApiResponse<StaffRoomAssignmentResponse>> assignRoom(
            @RequestBody StaffRoomAssignmentRequest request,
            @AuthenticationPrincipal UserDetails userDetails) {

        Long managerUserId = userRepository.findByEmail(userDetails.getUsername())
                .map(u -> u.getId())
                .orElse(null);

        return ResponseEntity.ok(
                ApiResponse.success(staffRoomAssignmentService.assignRoom(request, managerUserId)));
    }

    /**
     * Bước 2 Normal Flow UC-56: danh sách nhân sự on-duty + phòng hiện tại,
     * cho 1 ngày (mặc định hôm nay).
     */
    @GetMapping
    @PreAuthorize("hasAnyRole('MANAGER', 'ADMIN')")
    public ResponseEntity<ApiResponse<List<StaffRoomAssignmentResponse>>> getRoster(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {

        LocalDate target = date != null ? date : LocalDate.now();
        return ResponseEntity.ok(ApiResponse.success(staffRoomAssignmentService.getRosterForDate(target)));
    }

    /**
     * Endpoint đọc-only để các flow khác (booking, check-in, lab order, care
     * session) tra cứu phòng đã resolve theo BR-24 — không dùng để chọn phòng.
     */
    @GetMapping("/resolve")
    public ResponseEntity<ApiResponse<RoomResolutionResponse>> resolveRoom(
            @RequestParam StaffType staffType,
            @RequestParam Long staffId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {

        return ResponseEntity.ok(
                ApiResponse.success(staffRoomAssignmentService.resolveRoomForStaff(staffType, staffId, date)));
    }

    /**
     * UC-55 ALT-1: ai đang được phân trực phòng này — Manager xem trước khi vô hiệu
     * hoá phòng.
     */
    @GetMapping("/by-room/{roomId}")
    @PreAuthorize("hasAnyRole('MANAGER', 'ADMIN')")
    public ResponseEntity<ApiResponse<List<StaffRoomAssignmentResponse>>> getAssignmentsByRoom(
            @PathVariable Long roomId) {

        return ResponseEntity.ok(ApiResponse.success(staffRoomAssignmentService.getAssignmentsByRoom(roomId)));
    }
}