package com.ecms.dto.response;

import lombok.Builder;
import lombok.Data;
import java.math.BigDecimal;

@Data
@Builder
public class MedicineResponse {
    private Long id;
    private String name;
    private String dosageForm;
    private String unit;
    private BigDecimal unitPrice;
}
