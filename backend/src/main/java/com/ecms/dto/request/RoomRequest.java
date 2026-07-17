// UC-58: tạo/sửa 1 phòng trong danh mục + gán dịch vụ/loại xét nghiệm mà phòng phục vụ.
package com.ecms.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import lombok.*;

import java.util.List;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class RoomRequest {

    @NotBlank(message = "Vui lòng nhập tên phòng")
    private String name;

    /** DOCTOR | NURSE | LAB — quyết định ai được phân vào phòng ở UC-59. */
    @NotBlank(message = "Vui lòng chọn loại phòng")
    private String roomType;

    /** Mặc định 1 nếu bỏ trống (BR-24: phòng Chăm sóc & phục hồi = 1 người/phòng). */
    private Integer capacity;

    private Boolean isActive;

    /** E-1: bắt buộc chọn ít nhất 1 dịch vụ/loại xét nghiệm cho phòng. */
    @NotEmpty(message = "Vui lòng chọn ít nhất 1 dịch vụ/loại xét nghiệm cho phòng")
    private List<Long> serviceIds;
}
