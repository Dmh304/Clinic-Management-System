package com.ecms.dto.request;

import jakarta.validation.constraints.NotNull;
import lombok.*;

import java.time.LocalDateTime;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class BookCareSessionRequest {

    @NotNull(message = "Vui lòng chọn gói đăng ký")
    private Long subscriptionId;

    @NotNull(message = "Vui lòng chọn ngày giờ")
    private LocalDateTime scheduledDateTime;

    private String notes;
}
