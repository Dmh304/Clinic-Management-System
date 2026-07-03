// UC-55 - Manage User Account
// DTO nhận dữ liệu tạo tài khoản nhân viên mới từ Admin.
// Không nhận password — hệ thống tự sinh mật khẩu tạm. Role PATIENT bị chặn ở service layer.
// Khi role = DOCTOR: specialty và licenseNumber là bắt buộc (validate ở service layer).
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

    // Chỉ áp dụng khi role = DOCTOR (validate ở service layer)
    private String specialty;

    // Chỉ áp dụng khi role = DOCTOR; unique trong bảng doctors
    private String licenseNumber;

    // Số điện thoại nhân viên (tuỳ chọn, dùng trong hồ sơ bác sĩ/nhân viên)
    private String phone;
}
