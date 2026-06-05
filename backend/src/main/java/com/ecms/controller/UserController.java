// Mạnh Hùng - HE200743
// Controller xử lý API quản lý hồ sơ cá nhân của người dùng đang đăng nhập.
// Hỗ trợ xem và cập nhật thông tin cá nhân thông qua endpoint /api/v1/users/me.
package com.ecms.controller;

import com.ecms.dto.request.UpdateProfileRequest;
import com.ecms.dto.response.ApiResponse;
import com.ecms.dto.response.UserProfileResponse;
import com.ecms.service.UserService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/users")
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;

    // Lấy thông tin hồ sơ của người dùng hiện tại dựa trên email trích xuất từ token JWT
    @GetMapping("/me")
    public ResponseEntity<ApiResponse<UserProfileResponse>> getProfile(Authentication authentication) {
        return ResponseEntity.ok(ApiResponse.success(userService.getProfile(authentication.getName())));
    }

    // Cập nhật thông tin hồ sơ cá nhân (họ tên, SĐT, ngày sinh, giới tính, địa chỉ) cho người dùng hiện tại
    @PutMapping("/me")
    public ResponseEntity<ApiResponse<UserProfileResponse>> updateProfile(
            Authentication authentication,
            @Valid @RequestBody UpdateProfileRequest request) {
        UserProfileResponse data = userService.updateProfile(authentication.getName(), request);
        return ResponseEntity.ok(ApiResponse.success("Cập nhật hồ sơ thành công", data));
    }
}
