//Author: DucTKH - HE204463
//Created: 2026-06-22
//Last Update: 2026-07-26
// DTO trả về thông tin chung và danh sách thuốc của một Đơn thuốc.
package com.ecms.dto.response;

import com.ecms.entity.PrescriptionStatus;
import lombok.Builder;
import lombok.Data;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
public class PrescriptionResponse {
    private Long id;
    private Long medicalRecordId;
    private Long doctorId;
    private String doctorName;
    private Long patientId;
    private String patientName;
    private String patientCode;
    private String patientPhone;
    private String patientGender;
    private LocalDate patientDob;
    private PrescriptionStatus status;
    private String notes;
    private String dispenserName;
    private LocalDateTime createdAt;
    private Long invoiceId;
    private List<PrescriptionItemResponse> items;
}
