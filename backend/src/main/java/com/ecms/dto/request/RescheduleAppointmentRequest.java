package com.ecms.dto.request;

import lombok.*;

import java.time.LocalDateTime;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class RescheduleAppointmentRequest {

    /** Thời gian khám mới do bệnh nhân tự đổi */
    private LocalDateTime newAppointmentTime;
}
