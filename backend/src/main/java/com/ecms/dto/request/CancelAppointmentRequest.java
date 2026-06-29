package com.ecms.dto.request;

import lombok.*;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class CancelAppointmentRequest {

    /** Lý do huỷ lịch hẹn (tuỳ chọn) */
    private String reason;
}
