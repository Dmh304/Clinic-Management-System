package com.ecms.dto.response;

import lombok.*;

/**
 * Kết quả resolve phòng cho 1 nhân sự vào 1 ngày cụ thể.
 * Dùng bởi các flow khác (UC-12 Book Appointment, UC-19 Reassign Appointment,
 * UC-30 Issue Lab Order, UC-41 Book Care Session) để tự động lấy phòng theo
 * bác sĩ/nurse/kỹ thuật viên đã chọn — Patient/Receptionist không bao giờ tự
 * chọn phòng (BR-24).
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RoomResolutionResponse {
    private Long roomId;
    private String roomName;
    private boolean resolved;
    /** Thông báo khi không resolve được (vd. staff chưa được phân trực hôm nay). */
    private String message;
}