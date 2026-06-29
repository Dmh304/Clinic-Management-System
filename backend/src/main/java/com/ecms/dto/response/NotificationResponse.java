package com.ecms.dto.response;

import com.ecms.entity.Notification;
import lombok.*;

import java.time.LocalDateTime;

/**
 * UC-13: DTO trả về cho client khi hiển thị thông báo.
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class NotificationResponse {

    private Long id;
    private String message;
    private String targetRole;
    private Long targetUserId;
    private Long relatedAppointmentId;
    private Boolean isRead;
    private LocalDateTime createdAt;

    public static NotificationResponse from(Notification n) {
        return NotificationResponse.builder()
                .id(n.getId())
                .message(n.getMessage())
                .targetRole(n.getTargetRole())
                .targetUserId(n.getTargetUserId())
                .relatedAppointmentId(n.getRelatedAppointmentId())
                .isRead(n.getIsRead())
                .createdAt(n.getCreatedAt())
                .build();
    }
}
