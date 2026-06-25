package com.ecms.dto.request;

import jakarta.validation.constraints.*;
import lombok.*;

import java.math.BigDecimal;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class ServicePackageRequest {

    @NotBlank(message = "Tên gói dịch vụ không được trống")
    private String serviceName;

    @NotBlank(message = "Vui lòng nhập mô tả")
    private String description;

    @NotNull(message = "Vui lòng nhập giá")
    @DecimalMin(value = "0", inclusive = false, message = "Giá phải lớn hơn 0")
    private BigDecimal price;

    private String priceLabel;

    @NotNull(message = "Vui lòng nhập thời lượng")
    @Min(value = 1, message = "Thời lượng phải lớn hơn 0")
    private Integer durationMinutes;

    @NotNull(message = "Vui lòng nhập số buổi")
    @Min(value = 1, message = "Số buổi phải ít nhất 1")
    private Integer sessionsIncluded;

    @Min(value = 1, message = "Số ngày hiệu lực phải ít nhất 1")
    private Integer validityDays;

    private Long categoryId;

    // "CLINICAL" (dịch vụ khám, đặt lịch hẹn) hoặc "CARE" (gói chăm sóc, đăng ký tư vấn)
    private String serviceType;

    private String slug;

    @NotBlank(message = "Vui lòng thêm ảnh đại diện")
    private String thumbnailUrl;

    private String content;

    private String badge;

    private Boolean isActive;

    private Integer displayOrder;
}
