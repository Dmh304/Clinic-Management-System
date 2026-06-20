package com.ecms.dto.response;

import java.math.BigDecimal;
import java.time.LocalDateTime;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class LabResultResponse {
    private Long id;

    private Long labOrderId;

    /* Thị lực mắt trái khi chưa điều chỉnh kính */
    private BigDecimal vaL;

    /* Thị lực mắt phải khi chưa điều chỉnh kính */
    private BigDecimal vaR;

    /* Thị lực tối đa của mắt trái sau khi điều chỉnh kính tối ưu */
    private BigDecimal bcvaL;

    /* Thị lực tối đa của mắt phải sau khi điều chỉnh kính tối ưu */
    private BigDecimal bcvaR;

    /* Độ cầu mắt trái (dấu + cho viễn thị, dấu - cho cận thị) */
    private BigDecimal sphL;

    /* Độ loạn mắt trái */
    private BigDecimal cylL;

    /* Trục loạn thị mắt trái (đơn vị: độ, từ 0 đến 180) */
    private Integer axisL;

    /* Nhãn áp mắt trái (đơn vị: mmHg) */
    private BigDecimal iopL;

    /* Độ cầu mắt phải (dấu + cho viễn thị, dấu - cho cận thị) */
    private BigDecimal sphR;

    /* Độ loạn mắt phải */
    private BigDecimal cylR;

    /* Trục loạn thị mắt phải (đơn vị: độ, từ 0 đến 180) */
    private Integer axisR;

    /* Nhãn áp mắt phải (đơn vị: mmHg) */
    private BigDecimal iopR;

    private String imageUrl;

    private String doctorNotes;

    private Long medicalRecordId;

    private Long doctorId;

    private String doctorFullName;

    private Long labTechnicianId;

    private String labTechnicianFullName;

    private Long patientId;

    private String patientFullName;

    private LocalDateTime reviewedAt;

    private LocalDateTime createdAt;

    private LocalDateTime updatedAt;
}
