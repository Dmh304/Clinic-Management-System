package com.ecms.dto.response;

import lombok.Builder;
import lombok.Data;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@Builder
public class EyeglassPrescriptionResponse {
    private Long id;
    private Long medicalRecordId;
    private Long doctorId;
    private String doctorName;
    private Long patientId;
    private String patientName;

    private BigDecimal odSph;
    private BigDecimal odCyl;
    private Integer odAxis;
    private BigDecimal odAdd;

    private BigDecimal osSph;
    private BigDecimal osCyl;
    private Integer osAxis;
    private BigDecimal osAdd;

    private BigDecimal pd;
    private String lensType;
    private String notes;
    private String status;
    private LocalDateTime createdAt;
}
