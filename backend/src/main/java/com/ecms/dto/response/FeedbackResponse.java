package com.ecms.dto.response;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

/**
 * UC-48 / UC-53: Thông tin đánh giá trả về cho client.
 */
@Data
@Builder
public class FeedbackResponse {
    private Long id;
    private Long appointmentId;
    private Long careSessionId;
    private Long patientId;
    private String patientName;   // null nếu gửi ẩn danh
    private Long doctorId;
    private String doctorName;
    private Long nurseId;
    private String nurseName;
    private Integer rating;
    private String content;
    private Boolean isAnonymous;
    private String status;
    private LocalDateTime createdAt;
}
