// UC-59: Manage Staff Room Roster
package com.ecms.controller;

import com.ecms.dto.request.AssignRoomRequest;
import com.ecms.dto.response.ApiResponse;
import com.ecms.dto.response.RoomRosterEntry;
import com.ecms.dto.response.StaffRoomAssignmentResponse;
import com.ecms.service.RoomRosterService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/v1/room-roster")
@RequiredArgsConstructor
public class RoomRosterController {

    private final RoomRosterService roomRosterService;

    /** Danh sách nhân sự trực + phòng hiện tại trong 1 ngày — MANAGER */
    @GetMapping
    public ResponseEntity<ApiResponse<List<RoomRosterEntry>>> getRosterForDate(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        return ResponseEntity.ok(ApiResponse.success(roomRosterService.getRosterForDate(date)));
    }

    /** Phân công/đổi phòng cho 1 nhân sự (standing hoặc override 1 ngày) — MANAGER */
    @PostMapping("/assign")
    public ResponseEntity<ApiResponse<StaffRoomAssignmentResponse>> assign(
            @Valid @RequestBody AssignRoomRequest request,
            Authentication authentication, HttpServletRequest httpRequest) {
        return ResponseEntity.ok(ApiResponse.success("Phân công phòng thành công",
                roomRosterService.assign(request, authentication.getName(), httpRequest.getRemoteAddr())));
    }

    /** UC-58 ALT-1: các phân công đang trỏ tới 1 phòng — dùng khi phòng bị vô hiệu hoá — MANAGER */
    @GetMapping("/by-room/{roomId}")
    public ResponseEntity<ApiResponse<List<StaffRoomAssignmentResponse>>> getAssignmentsByRoom(
            @PathVariable Long roomId) {
        return ResponseEntity.ok(ApiResponse.success(roomRosterService.getAssignmentsByRoom(roomId)));
    }

    /** Phòng hiện tại của 1 nhân sự vào 1 ngày cụ thể — dùng bởi luồng đặt lịch để resolve room */
    @GetMapping("/resolve")
    public ResponseEntity<ApiResponse<StaffRoomAssignmentResponse>> resolveRoomForStaffOnDate(
            @RequestParam Long staffUserId,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        return ResponseEntity.ok(ApiResponse.success(
                roomRosterService.resolveRoomForStaffOnDate(staffUserId, date)));
    }
}
