package com.ecms.dto.request;

import jakarta.validation.constraints.NotNull;
import lombok.Builder;
import lombok.Data;
import java.math.BigDecimal;

@Data
@Builder
public class EyeglassPrescriptionRequest {
    @NotNull(message = "Thiếu medicalRecordId")
    private Long medicalRecordId;

    private BigDecimal odSph;
    private BigDecimal odCyl;
    private Integer odAxis;
    private BigDecimal odAdd;

    private BigDecimal osSph;
    private BigDecimal osCyl;
    private Integer osAxis;
    private BigDecimal osAdd;

    @NotNull(message = "Thiếu PD (Pupillary Distance)")
    private BigDecimal pd;

    @NotNull(message = "Thiếu loại tròng kính")
    private String lensType;

    private String notes;
}
