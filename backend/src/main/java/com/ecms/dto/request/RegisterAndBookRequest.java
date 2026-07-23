package com.ecms.dto.request;

import jakarta.validation.constraints.NotNull;
import lombok.*;

import java.time.LocalDateTime;

/**
 * Tạo ngày 21/07/2026
 * Bệnh nhân tự đăng ký + đặt buổi đầu tiên cho gói dịch vụ CARE ngay trên
 * website (kênh Website — không qua bước "chờ tư vấn" như đăng ký online cũ).
 * Hệ thống tạo đăng ký (đã hoàn tất), gói (subscription) và buổi care-session
 * đầu tiên trong một giao dịch, giống luồng lễ tân đăng ký tại quầy nhưng do
 * chính bệnh nhân tự thực hiện — không nhận patientId, luôn áp cho tài khoản
 * đang đăng nhập.
 */
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class RegisterAndBookRequest {

    @NotNull(message = "Vui lòng chọn gói dịch vụ")
    private Long serviceId;

    @NotNull(message = "Vui lòng chọn ngày giờ buổi đầu tiên")
    private LocalDateTime scheduledDateTime;

    private String notes;
}
