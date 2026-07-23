/**
 * Controller quản lý hồ sơ nhân viên (bảng staffs — dùng chung cho
 * RECEPTIONIST, PHARMACIST, NURSE, MANAGER, ADMIN).
 *
 * Hiện tại chỉ có endpoint đọc theo position/status, phục vụ UC-56 (Room
 * Roster cần danh sách Nurse). Mở rộng thêm CRUD sau nếu dự án cần UC-57-like
 * cho staff nói chung.
 */
package com.ecms.controller;

import com.ecms.dto.response.ApiResponse;
import com.ecms.dto.response.StaffResponse;
import com.ecms.service.StaffService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/staffs")
@RequiredArgsConstructor
@PreAuthorize("hasAnyRole('MANAGER', 'ADMIN')")
public class StaffController {

    private final StaffService staffService;

    /**
     * GET /api/v1/staffs?position=NURSE&status=ACTIVE
     * position để trống -> trả về toàn bộ staff theo status.
     */
    @GetMapping
    public ResponseEntity<ApiResponse<List<StaffResponse>>> getStaff(
            @RequestParam(required = false) String position,
            @RequestParam(required = false, defaultValue = "ACTIVE") String status) {

        List<StaffResponse> result = (position == null || position.isBlank())
                ? staffService.getAllStaff(status)
                : staffService.getStaffByPosition(position, status);

        return ResponseEntity.ok(ApiResponse.success(result));
    }
}