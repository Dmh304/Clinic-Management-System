// UC-56 - Configure System and Data
package com.ecms.dto.response;

import lombok.*;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class NotificationTemplateResponse {
    private Long id;
    private String templateKey;
    private String channel;
    private String subject;
    private String body;
    private String variablesHint;
    private boolean active;
    private String updatedByName;
    private LocalDateTime updatedAt;
}
