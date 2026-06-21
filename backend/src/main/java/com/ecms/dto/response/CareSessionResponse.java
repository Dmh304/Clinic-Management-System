package com.ecms.dto.response;

import lombok.*;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class CareSessionResponse {
    private Long id;
    private Long subscriptionId;
    private String serviceName;
    private Long patientId;
    private String patientName;
    private String patientCode;
    private Long nurseId;
    private String nurseName;
    private LocalDateTime scheduledDateTime;
    private String status;
    private Integer sessionNumber;
    private Integer totalSessions;
    private Integer remainingSessions;
    private String notes;
    private String nurseNotes;
    private LocalDateTime completedAt;
    private LocalDateTime assignedAt;
    private LocalDateTime createdAt;
}
