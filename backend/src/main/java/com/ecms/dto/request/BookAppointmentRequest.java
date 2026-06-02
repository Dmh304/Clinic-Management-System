package com.ecms.dto.request;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.time.LocalDateTime;

@Data
public class BookAppointmentRequest {

    @NotNull(message = "doctorId không được để trống")
    private Long doctorId;

    @NotNull(message = "appointmentTime không được để trống")
    private LocalDateTime appointmentTime;

    private String notes;
}
