//Author: DucTKH - HE204463
//Created: 2026-06-22
//Last Update: 2026-07-22
// DTO trả về thông tin chi tiết của một Đơn kính cho Frontend.
package com.ecms.dto.response;

import lombok.Builder;
import lombok.Data;
import java.math.BigDecimal;
import java.time.LocalDateTime;

//import com.ecms.entity.EyeglassPrescriptionStatus;

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
    private Long lensTypeId;
    private String lensTypeName;
    private BigDecimal lensTypePrice;
    private String notes;
    // private EyeglassPrescriptionStatus status;
    private LocalDateTime createdAt;
    
    private Boolean isOrdered;
    private Boolean isExpired;
    private Boolean hasNewer;
}
