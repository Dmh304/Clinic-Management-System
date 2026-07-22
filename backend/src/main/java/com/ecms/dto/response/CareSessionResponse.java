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
    private String patientPhone;
    private LocalDate patientDob;
    private String patientGender;
    private Long nurseId;
    private String nurseName;
    private Long roomId;
    private String roomName;
    private LocalDateTime scheduledDateTime;
    private String status;
    private Integer sessionNumber;
    private Integer totalSessions;
    private Integer remainingSessions;
    private String notes;
    private String nurseNotes;
    private Boolean checkedIn;
    private LocalDateTime checkInAt;
    private LocalDateTime startedAt;
    private LocalDateTime completedAt;
    /** Số phút thực hiện — tính từ startedAt/completedAt, null nếu chưa hoàn thành. */
    private Long durationMinutes;
    private Boolean isIncident;
    private LocalDateTime assignedAt;
    private LocalDateTime createdAt;
}
