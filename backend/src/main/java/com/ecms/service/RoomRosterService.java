// UC-59: Manage Staff Room Roster
package com.ecms.service;

import com.ecms.dto.request.AssignRoomRequest;
import com.ecms.dto.response.RoomRosterEntry;
import com.ecms.dto.response.StaffRoomAssignmentResponse;

import java.time.LocalDate;
import java.util.List;

public interface RoomRosterService {

    /** Danh sách nhân sự (DOCTOR/NURSE/LAB_TECHNICIAN) trực trong ngày kèm phòng hiện tại. */
    List<RoomRosterEntry> getRosterForDate(LocalDate date);

    StaffRoomAssignmentResponse assign(AssignRoomRequest request, String actorEmail, String ipAddress);

    /** UC-58 ALT-1: các phân công standing đang trỏ tới 1 phòng — dùng khi phòng bị vô hiệu hoá. */
    List<StaffRoomAssignmentResponse> getAssignmentsByRoom(Long roomId);

    /** Phòng hiện tại của 1 nhân sự vào 1 ngày cụ thể (đã áp dụng override nếu có) — dùng để
     *  resolve room cho UC-11 (lịch hẹn), UC-19 (buổi chăm sóc), UC-29 (đơn xét nghiệm).
     *  Trả về null nếu nhân sự chưa được phân công phòng nào tính đến ngày đó. */
    StaffRoomAssignmentResponse resolveRoomForStaffOnDate(Long staffUserId, LocalDate date);
}
