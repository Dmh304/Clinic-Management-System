package com.ecms.service;

import com.ecms.dto.request.FeedbackRequest;
import com.ecms.dto.response.FeedbackResponse;

import java.util.List;

/**
 * UC-48: Bệnh nhân gửi đánh giá sau buổi khám đã COMPLETED.
 */
public interface FeedbackService {

    /**
     * Gửi đánh giá cho một lịch hẹn của chính bệnh nhân.
     *
     * @param patientId bệnh nhân đang đăng nhập (đã phân giải từ tài khoản)
     * @param request   nội dung đánh giá
     */
    FeedbackResponse submitFeedback(Long patientId, FeedbackRequest request);

    /** Danh sách đánh giá đã gửi của một bệnh nhân. */
    List<FeedbackResponse> getMyFeedbacks(Long patientId);
}
