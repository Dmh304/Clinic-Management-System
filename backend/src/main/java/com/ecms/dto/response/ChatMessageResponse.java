//Author: DucTKH - HE204463
//Created: 2026-06-22
//Last Update: 2026-07-22

package com.ecms.dto.response;

import lombok.Builder;
import lombok.Data;
import java.time.LocalDateTime;

@Data
@Builder
public class ChatMessageResponse {
    private Long id;
    private Long sessionId;
    private String senderRole;
    private String content;
    private LocalDateTime createdAt;
}
