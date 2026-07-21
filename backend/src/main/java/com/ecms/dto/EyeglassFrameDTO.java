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
public class EyeglassFrameDTO {
    private Long id;
    private String name;
    private String brand;
    private String material;
    private String color;
    private BigDecimal price;
    private Integer stockQuantity;
    private String status;
}
