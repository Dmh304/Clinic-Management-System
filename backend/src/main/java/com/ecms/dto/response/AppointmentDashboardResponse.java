package com.ecms.dto.response;

import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AppointmentDashboardResponse {

    private Long total;
    private Long pending;
    private Long confirmed;
    private Long checkedIn;
    private Long inProgress;
    private Long completed;
    private Long cancelled;
}