package com.ecms.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class EyeglassOrderResponse {
    private Long id;
    private Long patientId;
    private String patientName;
    private Long prescriptionId;
    private String doctorName;
    private Long frameId;
    private String frameName;
    private String status;
    private BigDecimal totalAmount;
    private String cancelReason;
    private Long dispensedBy;
    private String dispensedByName;
    private LocalDateTime dispensedAt;
    private List<String> coatings;
    private LocalDateTime createdAt;

    private BigDecimal odSph;
    private BigDecimal odCyl;
    private Integer odAxis;
    private BigDecimal odAdd;
    private BigDecimal osSph;
    private BigDecimal osCyl;
    private Integer osAxis;
    private BigDecimal osAdd;
    private BigDecimal pd;
    private String lensTypeName;
    private String prescriptionNotes;
}
