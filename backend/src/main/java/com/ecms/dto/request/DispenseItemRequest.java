// DucTKH
// DTO chứa thông tin số lượng thực tế của một thuốc khi cấp phát.
package com.ecms.dto.request;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class DispenseItemRequest {
    @NotNull(message = "Thiếu ID của PrescriptionItem")
    private Long prescriptionItemId;

    @NotNull(message = "Thiếu số lượng thực tế")
    @Min(value = 0, message = "Số lượng không được nhỏ hơn 0")
    private Integer actualQuantity;
}
