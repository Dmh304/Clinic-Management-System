package com.ecms.service;

import com.ecms.dto.request.UpdateProfileRequest;
import com.ecms.dto.response.UserProfileResponse;

public interface UserService {
    UserProfileResponse getProfile(String email);
    UserProfileResponse updateProfile(String email, UpdateProfileRequest request);
}
