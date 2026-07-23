//Author: DucTKH - HE204463
//Created: 2026-06-01
//Last Update: 2026-06-25
// DTO chứa danh sách các loại thuốc và thông tin chung của Đơn thuốc do Frontend gửi lên.
package com.ecms.dto.request;

import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import lombok.Builder;
import lombok.Data;
import java.util.List;

@Data
@Builder
public class PrescriptionRequest {
    @NotNull(message = "Thiếu medicalRecordId")
    private Long medicalRecordId;

    private String notes;

    @NotEmpty(message = "Đơn thuốc phải có ít nhất 1 loại thuốc")
    private List<PrescriptionItemRequest> items;
}
