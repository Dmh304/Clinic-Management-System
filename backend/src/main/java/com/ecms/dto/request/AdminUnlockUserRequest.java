package com.ecms.dto.request;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class AdminUnlockUserRequest {

    @NotNull(message = "userId không được để trống")
    private Long userId;
}
