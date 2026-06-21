package com.ecms.dto.request;

import lombok.*;

import java.time.LocalDateTime;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class ReassignAppointmentRequest {

    /** Bác sĩ mới (null nếu chỉ đổi giờ) */
    private Long doctorId;

    /** Thời gian mới (null nếu chỉ đổi bác sĩ) */
    private LocalDateTime newAppointmentTime;

    private String reason;
}
