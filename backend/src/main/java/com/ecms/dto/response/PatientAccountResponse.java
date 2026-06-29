// UC-55 - Manage User Account
// DTO trả về cho màn hình Admin quản lý tài khoản Patient (chỉ mở khóa + reset mật khẩu,
// không sửa thông tin hồ sơ — hồ sơ patient quản lý qua Patient entity riêng).
package com.ecms.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PatientAccountResponse {
    private Long id;
    private String fullName;
    private String email;
    private String phone;
    private String status;
    private LocalDateTime createdAt;
}
