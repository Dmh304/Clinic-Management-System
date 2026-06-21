package com.ecms.dto.request;

import jakarta.validation.constraints.NotNull;
import lombok.*;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class AssignNurseRequest {

    @NotNull(message = "Vui lòng chọn điều dưỡng")
    private Long nurseId;
}
