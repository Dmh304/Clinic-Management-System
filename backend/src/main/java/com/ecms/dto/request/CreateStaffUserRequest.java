// UC-55 - Manage User Account
// DTO nhận dữ liệu tạo tài khoản nhân viên mới từ Admin.
// Không nhận password — hệ thống tự sinh mật khẩu tạm. Role PATIENT bị chặn ở service layer
// (BR phạm vi UC-55: Admin chỉ quản lý tài khoản nhân viên).
package com.ecms.dto.request;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class CreateStaffUserRequest {

    @NotBlank(message = "Họ tên không được để trống")
    private String fullName;

    @NotBlank(message = "Email không được để trống")
    @Email(message = "Email không hợp lệ")
    private String email;

    @NotBlank(message = "Vai trò không được để trống")
    private String role;

    private String department;
}
