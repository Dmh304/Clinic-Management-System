package com.ecms.dto.request;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.util.List;

/**
 * UC-48: Dữ liệu bệnh nhân gửi lên khi đánh giá sau buổi khám.
 */
@Data
public class FeedbackRequest {

    @NotNull(message = "Thiếu mã lịch hẹn")
    private Long appointmentId;

    @NotNull(message = "Vui lòng chọn số sao đánh giá")
    @Min(value = 1, message = "Đánh giá tối thiểu 1 sao")
    @Max(value = 5, message = "Đánh giá tối đa 5 sao")
    private Integer rating;

    private String content;

    private Boolean isAnonymous;

    // Điểm đánh giá riêng cho từng người tham gia (tùy chọn)
    private List<ParticipantRating> participantRatings;

    @Data
    public static class ParticipantRating {
        private String role;   // DOCTOR | RECEPTIONIST | LAB_TECHNICIAN
        private String name;
        @Min(1) @Max(5)
        private Integer rating;
    }
}
