// Mạnh Hùng - HE200743
// Controller xử lý các API xác thực người dùng: đăng nhập, đăng ký và đổi mật khẩu.
// Tất cả endpoint đều nằm dưới prefix /api/v1/auth và trả về chuẩn ApiResponse.
package com.ecms.controller;

import com.ecms.dto.request.ChangePasswordRequest;
import com.ecms.dto.request.GoogleLoginRequest;
import com.ecms.dto.request.LoginRequest;
import com.ecms.dto.request.RegisterRequest;
import com.ecms.dto.response.ApiResponse;
import com.ecms.dto.response.AuthResponse;
import com.ecms.service.AuthService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

    // Xử lý đăng nhập: xác thực email/mật khẩu và trả về token JWT cùng thông tin người dùng
    @PostMapping("/login")
    public ResponseEntity<ApiResponse<AuthResponse>> login(@Valid @RequestBody LoginRequest request) {
        AuthResponse data = authService.login(request);
        return ResponseEntity.ok(ApiResponse.success("Đăng nhập thành công", data));
    }

    // Đăng nhập bằng tài khoản Google: xác minh ID token, tự động tạo tài khoản PATIENT nếu email chưa tồn tại
    @PostMapping("/google")
    public ResponseEntity<ApiResponse<AuthResponse>> loginWithGoogle(@Valid @RequestBody GoogleLoginRequest request) {
        AuthResponse data = authService.loginWithGoogle(request);
        return ResponseEntity.ok(ApiResponse.success("Đăng nhập bằng Google thành công", data));
    }

    // Xử lý đăng ký tài khoản bệnh nhân mới và tự động trả về token để đăng nhập ngay
    @PostMapping("/register")
    public ResponseEntity<ApiResponse<AuthResponse>> register(@Valid @RequestBody RegisterRequest request) {
        AuthResponse data = authService.register(request);
        return ResponseEntity.ok(ApiResponse.success("Đăng ký thành công", data));
    }

    // Đổi mật khẩu cho người dùng đang đăng nhập (xác định qua token JWT trong header)
    @PutMapping("/change-password")
    public ResponseEntity<ApiResponse<Void>> changePassword(
            Authentication authentication,
            @Valid @RequestBody ChangePasswordRequest request) {
        authService.changePassword(authentication.getName(), request);
        return ResponseEntity.ok(ApiResponse.success("Đổi mật khẩu thành công", null));
    }
}
