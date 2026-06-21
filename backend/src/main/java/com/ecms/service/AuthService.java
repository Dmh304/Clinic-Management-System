// Mạnh Hùng - HE200743
// Interface định nghĩa các hành vi xác thực người dùng: đăng nhập, đăng ký và đổi mật khẩu.
// Được triển khai bởi AuthServiceImpl.
package com.ecms.service;

import com.ecms.dto.request.ChangePasswordRequest;
import com.ecms.dto.request.GoogleLoginRequest;
import com.ecms.dto.request.LoginRequest;
import com.ecms.dto.request.RegisterRequest;
import com.ecms.dto.response.AuthResponse;

public interface AuthService {
    // Xác thực thông tin đăng nhập và trả về token JWT cùng thông tin người dùng
    AuthResponse login(LoginRequest request);

    // Tạo tài khoản bệnh nhân mới và trả về token để tự động đăng nhập
    AuthResponse register(RegisterRequest request);

    // Đăng nhập/đăng ký bằng tài khoản Google: xác minh ID token, tìm hoặc tạo tài khoản với vai trò PATIENT
    AuthResponse loginWithGoogle(GoogleLoginRequest request);

    // Thay đổi mật khẩu cho người dùng có email tương ứng sau khi xác minh mật khẩu hiện tại
    void changePassword(String email, ChangePasswordRequest request);
}
