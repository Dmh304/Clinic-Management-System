package com.ecms.dto.response;

import lombok.*;

/**
 * Một khung giờ khám và tình trạng còn trống hay không, dùng cho luồng
 * bệnh nhân đặt lịch (UC-46). Tính dựa trên giờ làm việc cố định của phòng
 * khám trừ đi các lịch hẹn đã có của bác sĩ trong ngày + các giờ đã trôi qua.
 */
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class SlotAvailabilityResponse {
    /** Giờ khám dạng "HH:mm", ví dụ "07:30". */
    private String time;
    /** Buổi: "MORNING" hoặc "AFTERNOON". */
    private String session;
    /** Còn trống để đặt hay không. */
    private boolean available;
}
