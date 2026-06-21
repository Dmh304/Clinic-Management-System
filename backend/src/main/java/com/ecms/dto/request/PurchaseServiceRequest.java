package com.ecms.dto.request;

import jakarta.validation.constraints.NotNull;
import lombok.*;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class PurchaseServiceRequest {

    @NotNull(message = "Vui lòng chọn gói dịch vụ")
    private Long serviceId;

    /** Mã giảm giá (không bắt buộc) */
    private String discountCode;

    /** Dành cho lễ tân mua hộ bệnh nhân */
    private Long patientId;

    private String notes;
}
