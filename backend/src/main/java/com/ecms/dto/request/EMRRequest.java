package com.ecms.dto.request;

import lombok.Data;

import java.math.BigDecimal;

@Data
public class EMRRequest {

    private Long appointmentId;
    private Long doctorId;

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

    // "DRAFT" | "IN_PROGRESS" | "COMPLETED"
    private String status;
}
