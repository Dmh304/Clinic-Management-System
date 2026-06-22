// Le Thi Bich Ngan - HE204710
// DTO chứa dữ liệu đầu vào khi lễ tân đăng ký bệnh nhân vãng lai.
// Bắt buộc: fullName, phone (10-11 chữ số), dateOfBirth.
// Email là tùy chọn (trẻ em thường không có email — backend tự sinh nếu thiếu).
// CCCD tùy chọn, dùng làm định danh chính cho bệnh nhân từ 14 tuổi.
// emergencyContactName/Phone dùng cho bệnh nhân trẻ em (lưu thông tin phụ huynh).

package com.ecms.dto.request;

import jakarta.validation.constraints.*;
import lombok.*;

import java.time.LocalDate;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor
public class PatientRequest {

    @NotBlank(message = "Họ tên không được để trống")
    private String fullName;

    @NotBlank(message = "Số điện thoại không được để trống")
    @Pattern(regexp = "^[0-9]{10,11}$", message = "Số điện thoại phải có 10-11 chữ số")
    private String phone;

    @Email(message = "Email không hợp lệ")
    private String email;

    @NotNull(message = "Ngày sinh không được để trống")
    private LocalDate dateOfBirth;

    private String gender;

    private String address;

    @Pattern(regexp = "^[0-9]{12}$", message = "CCCD phải có đúng 12 chữ số")
    private String cccd;

    private String emergencyContactName;

    private String emergencyContactPhone;
}
