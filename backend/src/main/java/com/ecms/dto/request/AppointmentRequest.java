package com.ecms.dto.request;

import lombok.Data;

@Data
public class AppointmentRequest {
    private Long patientId;
    private Long doctorId;
    private Long serviceId;
    private String appointmentTime;
    private String type;
    private String notes;
}