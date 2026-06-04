// Mạnh Hùng - HE200743
// DTO nhận dữ liệu đổi mật khẩu từ client.
// Gồm mật khẩu hiện tại, mật khẩu mới (tối thiểu 8 ký tự) và xác nhận mật khẩu mới.
package com.ecms.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class ChangePasswordRequest {

    @NotBlank(message = "Mật khẩu hiện tại không được để trống")
    private String currentPassword;

    @NotBlank(message = "Mật khẩu mới không được để trống")
    @Size(min = 8, message = "Mật khẩu mới phải có ít nhất 8 ký tự")
    private String newPassword;

    @NotBlank(message = "Xác nhận mật khẩu không được để trống")
    private String confirmPassword;
}
