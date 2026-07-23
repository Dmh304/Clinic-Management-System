//Author: DucTKH - HE204463
//Created: 2026-06-22
//Last Update: 2026-07-22

package com.ecms.dto.response;

import lombok.Builder;
import lombok.Data;
import java.time.LocalDateTime;

@Data
@Builder
public class ChatSessionResponse {
    private Long id;
    private Long patientId;
    private String patientName;
    private Long assignedToId;
    private String assignedToName;
    private String status;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
