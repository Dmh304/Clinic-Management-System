package com.ecms.dto.response;

import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class ServiceSubscriptionResponse {
    private Long id;
    private Long patientId;
    private String patientName;
    private String patientCode;
    private Long serviceId;
    private String serviceName;
    private Integer totalSessions;
    private Integer usedSessions;
    private Integer remainingSessions;
    private LocalDate purchaseDate;
    private LocalDate expiryDate;
    private String status;
    private BigDecimal finalPrice;
    private Long discountId;
    private String discountName;
    private String notes;
    private LocalDateTime createdAt;
}
