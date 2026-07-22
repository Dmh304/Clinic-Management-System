package com.ecms.controller;

import com.ecms.dto.request.FeedbackRequest;
import com.ecms.dto.response.ApiResponse;
import com.ecms.dto.response.FeedbackResponse;
import com.ecms.entity.Patient;
import com.ecms.entity.User;
import com.ecms.exception.ResourceNotFoundException;
import com.ecms.repository.PatientRepository;
import com.ecms.repository.UserRepository;
import com.ecms.service.FeedbackService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * UC-48: Bệnh nhân gửi và xem đánh giá của mình.
 * Base URL: /api/v1/feedbacks
 */
@RestController
@RequestMapping("/api/v1/feedbacks")
@RequiredArgsConstructor
public class FeedbackController {

    private final FeedbackService feedbackService;
    private final UserRepository userRepository;
    private final PatientRepository patientRepository;

    // Gửi đánh giá cho một lịch hẹn đã hoàn thành của chính bệnh nhân
    @PostMapping
    public ResponseEntity<ApiResponse<FeedbackResponse>> submit(
            @AuthenticationPrincipal UserDetails userDetails,
            @Valid @RequestBody FeedbackRequest request) {
        Long patientId = resolvePatientId(userDetails);
        return ResponseEntity.ok(ApiResponse.success(
                feedbackService.submitFeedback(patientId, request)));
    }

    // Thông tin buổi khám + người tham gia (bác sĩ, lễ tân, KTV) để hiển thị khi đánh giá
    @GetMapping("/appointment/{appointmentId}/participants")
    public ResponseEntity<ApiResponse<Map<String, Object>>> participants(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable Long appointmentId) {
        Long patientId = resolvePatientId(userDetails);
        return ResponseEntity.ok(ApiResponse.success(
                feedbackService.getVisitParticipants(patientId, appointmentId)));
    }

    // Danh sách đánh giá đã gửi của bệnh nhân đang đăng nhập
    @GetMapping("/my")
    public ResponseEntity<ApiResponse<List<FeedbackResponse>>> myFeedbacks(
            @AuthenticationPrincipal UserDetails userDetails) {
        Long patientId = resolvePatientId(userDetails);
        return ResponseEntity.ok(ApiResponse.success(feedbackService.getMyFeedbacks(patientId)));
    }

    private Long resolvePatientId(UserDetails userDetails) {
        User user = userRepository.findByEmail(userDetails.getUsername())
                .orElseThrow(() -> new ResourceNotFoundException("Người dùng không tồn tại"));
        Patient patient = patientRepository.findByUserId(user.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy hồ sơ bệnh nhân"));
        return patient.getId();
    }
}
