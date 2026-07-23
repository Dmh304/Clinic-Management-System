package com.ecms.service;

import com.ecms.dto.request.StaffRoomAssignmentRequest;
import com.ecms.dto.response.RoomResolutionResponse;
import com.ecms.dto.response.StaffRoomAssignmentResponse;
import com.ecms.entity.StaffType;

import java.time.LocalDate;
import java.util.List;

public interface StaffRoomAssignmentService {

    /**
     * Tạo/cập nhật phân trực phòng cho 1 nhân sự (UC-56 Normal Flow + ALT-1).
     */
    StaffRoomAssignmentResponse assignRoom(StaffRoomAssignmentRequest request, Long managerUserId);

    /**
     * Danh sách nhân sự đang trực (mỗi loại) cho 1 ngày — dùng cho màn hình
     * 'Room Roster' (bước 2 Normal Flow UC-56).
     */
    List<StaffRoomAssignmentResponse> getRosterForDate(LocalDate date);

    /**
     * Cốt lõi BR-24: resolve phòng cho 1 nhân sự vào 1 ngày cụ thể.
     * Được các flow khác (UC-12, UC-19, UC-30, UC-41) gọi để tự động gán
     * phòng theo bác sĩ/nurse/kỹ thuật viên đã chọn.
     */
    RoomResolutionResponse resolveRoomForStaff(StaffType staffType, Long staffId, LocalDate date);

    /**
     * Như resolveRoomForStaff nhưng nhận users.id và tự suy ra staffType —
     * tiện cho các luồng chỉ cầm User/Doctor (UC-11 đặt lịch, UC-19 buổi chăm
     * sóc, UC-29 đơn xét nghiệm) mà không phải tự tra bảng chuyên môn.
     * Trả về resolved = false nếu user không thuộc nhân sự nào có phân trực.
     */
    RoomResolutionResponse resolveRoomForUser(Long staffUserId, LocalDate date);

    /**
     * UC-55 ALT-1: các phân công đang trỏ tới 1 phòng — dùng khi Manager định vô
     * hiệu hoá phòng và cần biết ai đang trực để xử lý trước.
     */
    List<StaffRoomAssignmentResponse> getAssignmentsByRoom(Long roomId);
}