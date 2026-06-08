// Mạnh Hùng - HE200743
// DTO nhận ID token từ client sau khi người dùng đăng nhập bằng Google ở phía frontend.
package com.ecms.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class GoogleLoginRequest {

    @NotBlank(message = "Thiếu ID token từ Google")
    private String idToken;
}
