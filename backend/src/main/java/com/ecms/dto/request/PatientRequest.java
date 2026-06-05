// Le Thi Bich Ngan - HE204710
// DTO chứa dữ liệu đầu vào khi lễ tân đăng ký bệnh nhân vãng lai.
// Bắt buộc: fullName, phone (10-11 chữ số), email hợp lệ.
// Tùy chọn: dateOfBirth, gender, address.

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

    @NotBlank(message = "Email không được để trống")
    @Email(message = "Email không hợp lệ")
    private String email;

    private LocalDate dateOfBirth;

    private String gender;

    private String address;
}
