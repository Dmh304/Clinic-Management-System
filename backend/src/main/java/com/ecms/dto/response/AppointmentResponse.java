package com.ecms.dto.response;

import com.ecms.entity.AppointmentStatus;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDate;
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
    private String patientGender;
    private LocalDate patientDob;
    private String patientEmail;
    private String patientAddress;
    private Long doctorId;
    private String doctorName;
    private Long serviceId;
    private String serviceName;
    private BigDecimal servicePrice;
    private LocalDateTime appointmentTime;
    private String timeSlot;
    private AppointmentStatus status;
    private String type;
    private Integer queueNumber;
    private LocalDateTime checkInTime;
    private String notes;
    private String cancelReason;
    private LocalDateTime cancelledAt;
    private LocalDateTime createdAt;

    // Người ĐẶT lịch hẹn (khi đặt hộ người thân) — resolve từ booked_by, KHÔNG
    // parse từ notes. Null nếu người đặt chính là bệnh nhân (tự đặt cho mình).
    private String bookedByName;
    private String bookedByPhone;
}