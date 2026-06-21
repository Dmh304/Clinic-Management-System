package com.ecms.dto.response;

import lombok.*;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class ServiceRegistrationResponse {
    private Long id;
    private Long serviceId;
    private String serviceName;
    private Long patientId;
    private String patientName;
    private String registeredByName;
    private String registeredByRole;
    private LocalDate registrationDate;
    private String status;
    private String notes;
    private LocalDateTime createdAt;
}
