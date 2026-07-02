// DucTKH
// DTO chứa thông tin chi tiết của một loại thuốc trong Đơn thuốc do Frontend gửi lên.
package com.ecms.dto.request;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class PrescriptionItemRequest {
    @NotNull(message = "Thiếu medicineId")
    private Long medicineId;

    @NotNull(message = "Thiếu số lượng")
    @Min(value = 1, message = "Số lượng phải lớn hơn 0")
    private Integer quantity;

    @NotNull(message = "Thiếu liều dùng")
    private String dosage;

    @NotNull(message = "Thiếu tần suất")
    private String frequency;

    @NotNull(message = "Thiếu thời gian dùng (ngày)")
    @Min(value = 1, message = "Thời gian dùng phải lớn hơn 0")
    private Integer duration;

    private String instructions;
}
