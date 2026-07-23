package com.ecms.dto.request;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class UpdateDoctorFeaturedRequest {

    @NotNull(message = "featured là bắt buộc")
    private Boolean featured;
}
