package com.ecms.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class VerifyChangePasswordOtpRequest {

    @NotBlank(message = "Mã OTP không được để trống")
    private String otp;
}
