// UC-55 - Manage User Account
// DTO nhận dữ liệu sửa thông tin tài khoản nhân viên: họ tên, vai trò, phòng/bộ phận.
package com.ecms.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class UpdateStaffUserRequest {

    @NotBlank(message = "Họ tên không được để trống")
    private String fullName;

    @NotBlank(message = "Vai trò không được để trống")
    private String role;

    private String department;
}
