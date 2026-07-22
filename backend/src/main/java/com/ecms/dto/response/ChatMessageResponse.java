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
