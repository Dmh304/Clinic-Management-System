// UC-59: 1 dòng trong danh sách roster theo ngày — nhân sự trực + phòng hiện tại (nếu đã phân công).
package com.ecms.dto.response;

import lombok.*;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class RoomRosterEntry {
    private Long staffUserId;
    private String staffFullName;
    /** DOCTOR | NURSE | LAB_TECHNICIAN */
    private String staffRole;
    private Long roomId;
    private String roomName;
    private Boolean isOverrideToday;
}
