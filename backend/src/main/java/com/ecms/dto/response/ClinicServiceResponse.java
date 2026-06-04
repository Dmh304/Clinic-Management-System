// Mạnh Hùng - HE200743
// DTO trả về thông tin một dịch vụ khám chữa bệnh: ID, tên dịch vụ, mô tả, giá và thời lượng (phút).
package com.ecms.dto.response;

import lombok.*;
import java.math.BigDecimal;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class ClinicServiceResponse {
    private Long id;
    private String serviceName;
    private String description;
    private BigDecimal price;
    private Integer durationMinutes;
}
