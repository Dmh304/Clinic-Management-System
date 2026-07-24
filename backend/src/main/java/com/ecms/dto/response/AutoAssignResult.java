package com.ecms.dto.response;

import lombok.*;

import java.util.List;

/** Kết quả chạy "Auto-Assign Remaining" (UC-19 ALT-1). */
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class AutoAssignResult {
    private int assignedCount;
    private int stillUnassignedCount;
    private List<CareSessionResponse> assignedSessions;
}
