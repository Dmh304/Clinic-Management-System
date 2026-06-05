// Mạnh Hùng - HE200743
// Interface định nghĩa các hành vi quản lý hồ sơ người dùng: xem và cập nhật thông tin cá nhân.
// Được triển khai bởi UserServiceImpl.
package com.ecms.service;

import com.ecms.dto.request.UpdateProfileRequest;
import com.ecms.dto.response.UserProfileResponse;

public interface UserService {
    // Lấy thông tin hồ sơ của người dùng theo email
    UserProfileResponse getProfile(String email);

    // Cập nhật thông tin hồ sơ cá nhân của người dùng theo email
    UserProfileResponse updateProfile(String email, UpdateProfileRequest request);
}
