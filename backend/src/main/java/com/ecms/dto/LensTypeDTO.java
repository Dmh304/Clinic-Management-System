package com.ecms.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class LensTypeDTO {
    private Long id;
    private String name;
    private String description;
    private BigDecimal basePrice;
    private String status;
}
