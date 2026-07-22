package com.ecms.dto.response;

import com.ecms.entity.StaffType;
import lombok.*;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class StaffRoomAssignmentResponse {
    private Long id;
    private StaffType staffType;
    private Long staffId;
    private String staffFullName;

    private Long roomId;
    private String roomName;

    private LocalDate effectiveFrom;
    private LocalDate workDate;
    private Boolean isOneDayOverride;

    private Long assignedBy;
    private LocalDateTime createdAt;
}