package com.ecms.dto.request;

import jakarta.validation.constraints.NotNull;
import lombok.*;

import java.time.LocalDateTime;

/**
 * Lễ tân đăng ký dịch vụ cho khách đến trực tiếp quầy (walk-in): chỉ định sẵn
 * bệnh nhân + gói dịch vụ + thời gian buổi đầu tiên. Hệ thống tạo đăng ký
 * (đã hoàn tất), gói (subscription) và buổi care-session đầu tiên trong một
 * giao dịch — khác với luồng đăng ký online (chỉ tạo đăng ký chờ tư vấn).
 */
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class CounterServiceRegistrationRequest {

    @NotNull(message = "Vui lòng chọn bệnh nhân")
    private Long patientId;

    @NotNull(message = "Vui lòng chọn gói dịch vụ")
    private Long serviceId;

    @NotNull(message = "Vui lòng chọn ngày giờ đến làm dịch vụ")
    private LocalDateTime scheduledDateTime;

    private String notes;
}
