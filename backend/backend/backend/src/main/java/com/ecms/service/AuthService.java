package com.ecms.service;

import com.ecms.dto.request.ChangePasswordRequest;
import com.ecms.dto.request.LoginRequest;
import com.ecms.dto.request.RegisterRequest;
import com.ecms.dto.response.AuthResponse;

public interface AuthService {
    AuthResponse login(LoginRequest request);
    AuthResponse register(RegisterRequest request);
    void changePassword(String email, ChangePasswordRequest request);
}
