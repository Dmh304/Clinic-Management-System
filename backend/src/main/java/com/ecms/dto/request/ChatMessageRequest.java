//Author: DucTKH - HE204463
//Created: 2026-07-12
//Last Update: 2026-07-22

package com.ecms.dto.request;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ChatMessageRequest {
    private Long sessionId; // null nếu là tin nhắn đầu tiên từ patient
    private String content;
    // senderRole sẽ được lấy từ Authentication/Principal trong controller
}
