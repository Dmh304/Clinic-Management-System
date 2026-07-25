package com.ecms.dto.request;

import jakarta.validation.constraints.NotNull;
import lombok.*;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class AssignNurseRequest {

    @NotNull(message = "Vui lòng chọn điều dưỡng")
    private Long nurseId;

    /** UC-19 E-2: true để vẫn phân công dù điều dưỡng đã đủ sức chứa/ngày (Manager xác nhận override). */
    private Boolean override;
}
