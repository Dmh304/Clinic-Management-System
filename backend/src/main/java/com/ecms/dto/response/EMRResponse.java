package com.ecms.dto.response;

import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class EMRResponse {

    private Long id;
    private Long appointmentId;
    private LocalDateTime appointmentTime;
    private String timeSlot;

    private Long patientId;
    private String patientName;
    private String patientPhone;

    private Long doctorId;
    private String doctorName;

    private String chiefComplaint;
    private String symptoms;
    private String diagnosis;
    private String treatmentPlan;
    private String notes;

    // Visual acuity
    private BigDecimal vaL;
    private BigDecimal vaR;
    private BigDecimal bcvaL;
    private BigDecimal bcvaR;

    // Left eye optical
    private BigDecimal sphL;
    private BigDecimal cylL;
    private Integer axisL;
    private BigDecimal iopL;

    // Right eye optical
    private BigDecimal sphR;
    private BigDecimal cylR;
    private Integer axisR;
    private BigDecimal iopR;

    private String status;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
