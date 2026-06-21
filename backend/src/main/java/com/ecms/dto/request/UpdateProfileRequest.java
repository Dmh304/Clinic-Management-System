// Mạnh Hùng - HE200743
// DTO nhận dữ liệu cập nhật hồ sơ cá nhân từ client.
// Tất cả các trường đều là tùy chọn (không bắt buộc); số điện thoại được validate định dạng Việt Nam.
package com.ecms.dto.request;

import jakarta.validation.constraints.Pattern;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDate;

@Getter
@Setter
public class UpdateProfileRequest {

    private String fullName;

    @Pattern(regexp = "^(0[3|5|7|8|9])[0-9]{8}$", message = "Số điện thoại không hợp lệ")
    private String phone;

    private LocalDate dateOfBirth;
    private String gender;
    private String address;
}
