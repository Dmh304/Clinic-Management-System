//Author: DucTKH - HE204463
//Created: 2026-06-22
//Last Update: 2026-07-22

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
