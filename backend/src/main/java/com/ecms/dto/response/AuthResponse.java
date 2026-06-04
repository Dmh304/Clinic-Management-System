// Mạnh Hùng - HE200743
// DTO trả về sau khi đăng nhập hoặc đăng ký thành công.
// Chứa token JWT, loại token (Bearer), ID người dùng, email, họ tên, vai trò và doctorId (nếu là bác sĩ).
package com.ecms.dto.response;

import lombok.*;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AuthResponse {

    private String token;

    @Builder.Default
    private String tokenType = "Bearer";

    private Long userId;
    private String email;
    private String fullName;
    private String role;
    private Long doctorId;
}
