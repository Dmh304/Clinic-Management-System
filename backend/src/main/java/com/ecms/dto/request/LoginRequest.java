// Mạnh Hùng - HE200743
// DTO nhận dữ liệu đăng nhập từ client: email và mật khẩu.
// Có validation tự động: email đúng định dạng, cả hai trường đều không được để trống.
package com.ecms.dto.request;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class LoginRequest {

    @NotBlank(message = "Email không được để trống")
    @Email(message = "Email không hợp lệ")
    private String email;

    @NotBlank(message = "Mật khẩu không được để trống")
    private String password;
}
