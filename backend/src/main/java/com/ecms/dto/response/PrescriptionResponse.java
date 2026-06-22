package com.ecms.dto.response;

import com.ecms.entity.PrescriptionStatus;
import lombok.Builder;
import lombok.Data;
import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
public class PrescriptionResponse {
    private Long id;
    private Long medicalRecordId;
    private Long doctorId;
    private String doctorName;
    private Long patientId;
    private String patientName;
    private PrescriptionStatus status;
    private String notes;
    private LocalDateTime createdAt;
    private List<PrescriptionItemResponse> items;
}
