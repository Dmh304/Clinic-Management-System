package com.ecms.dto.request;

import jakarta.validation.constraints.NotNull;
import lombok.*;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor
public class ServiceRegistrationRequest {

    @NotNull(message = "ID dịch vụ không được để trống")
    private Long serviceId;

    /** Chỉ bắt buộc khi lễ tân đăng ký thay cho bệnh nhân */
    private Long patientId;

    private String notes;
}
