package com.ecms.dto.request;

import jakarta.validation.constraints.NotNull;
import lombok.*;

import java.time.LocalDateTime;

/**
 * Lễ tân đặt buổi đến phòng khám cho một đăng ký dịch vụ đã được tư vấn và
 * khách đồng ý: hệ thống tạo gói (subscription) + buổi care-session đầu tiên
 * vào thời điểm đã chọn.
 */
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class ScheduleClinicVisitRequest {

    @NotNull(message = "Vui lòng chọn ngày giờ đến phòng khám")
    private LocalDateTime scheduledDateTime;

    private String notes;
}
