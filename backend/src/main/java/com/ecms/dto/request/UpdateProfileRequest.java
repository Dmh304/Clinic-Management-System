// Mạnh Hùng - HE200743
// DTO nhận dữ liệu cập nhật hồ sơ cá nhân từ client.
// Tất cả các trường đều là tùy chọn (không bắt buộc); số điện thoại/CCCD được validate định dạng Việt Nam.
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

    @Pattern(regexp = "^[0-9]{12}$", message = "CCCD phải gồm 12 chữ số")
    private String cccd;

    @Pattern(regexp = "^(A|B|AB|O|UNKNOWN)$", message = "Nhóm máu không hợp lệ")
    private String bloodType;

    private String allergyNotes;
    private String emergencyContactName;

    @Pattern(regexp = "^(0[3|5|7|8|9])[0-9]{8}$", message = "Số điện thoại người liên hệ không hợp lệ")
    private String emergencyContactPhone;
}
