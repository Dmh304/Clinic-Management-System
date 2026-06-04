// Mạnh Hùng - HE200743
// DTO nhận dữ liệu đăng ký tài khoản bệnh nhân từ client.
// Gồm: họ tên, email, số điện thoại và mật khẩu (tối thiểu 6 ký tự).
// Có validation tự động cho từng trường.
package com.ecms.dto.request;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class RegisterRequest {

    @NotBlank(message = "Họ tên không được để trống")
    private String fullName;

    @NotBlank(message = "Email không được để trống")
    @Email(message = "Email không hợp lệ")
    private String email;

    @NotBlank(message = "Số điện thoại không được để trống")
    private String phone;

    @NotBlank(message = "Mật khẩu không được để trống")
    @Size(min = 6, message = "Mật khẩu phải có ít nhất 6 ký tự")
    private String password;
}
