package com.ecms.dto.request;

import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class EyeglassOrderRequest {
    @NotNull(message = "Thiếu ID đơn kính")
    private Long prescriptionId;

    private Long frameId;

    private List<Long> coatingIds;
}
