package com.ecms.dto.response;

import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class DiscountCampaignResponse {
    private Long id;
    private String name;
    private String description;
    private String type;
    private BigDecimal value;
    private String voucherCode;
    private LocalDate validFrom;
    private LocalDate validTo;
    private BigDecimal minPurchaseAmount;
    private Integer maxUsageCount;
    private Integer usedCount;
    private Boolean isActive;
    private LocalDateTime createdAt;
}
