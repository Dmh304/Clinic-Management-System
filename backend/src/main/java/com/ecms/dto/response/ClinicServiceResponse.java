// Mạnh Hùng - HE200743
// DTO trả về thông tin một dịch vụ khám chữa bệnh: ID, tên dịch vụ, mô tả, giá và thời lượng (phút).
package com.ecms.dto.response;

import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class ClinicServiceResponse {
    private Long id;
    private String serviceName;
    private String description;
    private BigDecimal price;
    private String priceLabel;
    private Integer durationMinutes;
    private String badge;
    private String thumbnailUrl;
    private String content;
    private String slug;
    private Integer sessionsIncluded;
    private Integer validityDays;
    private Boolean isActive;
    private Integer displayOrder;
    private Long categoryId;
    private String categoryName;
    private String serviceType;
    private LocalDateTime createdAt;
}
