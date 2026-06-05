// Mạnh Hùng - HE200743
// DTO trả về thông tin hồ sơ cá nhân của người dùng đang đăng nhập.
// Kết hợp dữ liệu từ bảng User (email, họ tên, SĐT, vai trò) và Patient (ngày sinh, giới tính, địa chỉ).
package com.ecms.dto.response;

import lombok.*;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserProfileResponse {
    private Long userId;
    private String email;
    private String fullName;
    private String phone;
    private String role;
    private LocalDate dateOfBirth;
    private String gender;
    private String address;
    private LocalDateTime createdAt;
}
