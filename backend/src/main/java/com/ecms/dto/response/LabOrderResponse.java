package com.ecms.dto.response;

import java.time.LocalDateTime;

import com.ecms.entity.LabOrderStatus;
import com.ecms.entity.LabPriority;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class LabOrderResponse {
    private Long id;

    private Long medicalRecordId;

    private String doctorFullName;

    private String labTechnicianFullName;

    private String patientFullName;

    private String notes;

    private LabPriority priority;

    private LabOrderStatus status;

    private String rejectionReason;

    private LocalDateTime rejectedAt;

    private LocalDateTime createdAt;

    private LocalDateTime completedAt;

}
