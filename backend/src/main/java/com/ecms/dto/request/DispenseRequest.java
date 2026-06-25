// DucTKH
// DTO nhận danh sách các thuốc cần chỉnh sửa số lượng khi Dược sĩ ấn nút Phát thuốc.
package com.ecms.dto.request;

import jakarta.validation.Valid;
import lombok.Data;

import java.util.List;

@Data
public class DispenseRequest {
    @Valid
    private List<DispenseItemRequest> items;
}
