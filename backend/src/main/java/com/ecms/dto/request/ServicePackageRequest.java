package com.ecms.dto.request;

import jakarta.validation.constraints.*;
import lombok.*;

import java.math.BigDecimal;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class ServicePackageRequest {

    @NotBlank(message = "Tên gói dịch vụ không được trống")
    private String serviceName;

    private String description;

    @NotNull(message = "Vui lòng nhập giá")
    @DecimalMin(value = "0", message = "Giá không được âm")
    private BigDecimal price;

    private String priceLabel;

    private Integer durationMinutes;

    @NotNull(message = "Vui lòng nhập số buổi")
    @Min(value = 1, message = "Số buổi phải ít nhất 1")
    private Integer sessionsIncluded;

    @Min(value = 1, message = "Số ngày hiệu lực phải ít nhất 1")
    private Integer validityDays;

    private Long categoryId;

    private String slug;

    private String thumbnailUrl;

    private String content;

    private String badge;

    private Boolean isActive;

    private Integer displayOrder;
}
