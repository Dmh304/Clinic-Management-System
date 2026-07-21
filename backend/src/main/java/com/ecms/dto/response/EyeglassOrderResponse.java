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
    private Long frameId;
    private String frameName;
    private String status;
    private BigDecimal totalAmount;
    private Long dispensedBy;
    private String dispensedByName;
    private LocalDateTime dispensedAt;
    private List<String> coatings;
    private LocalDateTime createdAt;
}
