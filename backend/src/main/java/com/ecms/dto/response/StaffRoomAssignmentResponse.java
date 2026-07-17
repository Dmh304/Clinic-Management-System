package com.ecms.dto.response;

import lombok.*;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class StaffRoomAssignmentResponse {
    private Long id;
    private Long staffUserId;
    private String staffFullName;
    private String staffRole;
    private Long roomId;
    private String roomName;
    private String roomType;
    private LocalDate effectiveFrom;
    private Boolean isOverride;
    private LocalDate overrideDate;
    private Long assignedById;
    private String assignedByName;
    private LocalDateTime createdAt;
}
