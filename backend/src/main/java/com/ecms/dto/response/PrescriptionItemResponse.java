package com.ecms.dto.response;

import lombok.Builder;
import lombok.Data;
import java.math.BigDecimal;

@Data
@Builder
public class PrescriptionItemResponse {
    private Long id;
    private Long medicineId;
    private String medicineName;
    private String dosageForm;
    private String unit;
    private Integer quantity;
    private String dosage;
    private String frequency;
    private Integer duration;
    private String instructions;
    private BigDecimal unitPrice;
    private BigDecimal totalPrice;
}
