package com.ecms.dto.response;

import com.ecms.entity.AppointmentStatus;
import lombok.*;

import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AppointmentResponse {

    private Long id;
    private Long patientId;
    private String patientName;
    private String patientPhone;
    private Long doctorId;
    private String doctorName;
    private String serviceName;
    private LocalDateTime appointmentTime;
    private String timeSlot;
    private AppointmentStatus status;
    private String type;
    private Integer queueNumber;
    private LocalDateTime checkInTime;
    private String notes;
    private LocalDateTime createdAt;
}