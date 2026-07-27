package com.ecms.dto.response;

import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class CareSessionResponse {
    private Long id;
    private Long subscriptionId;
    private String serviceName;
    /** UC-21: giá gói dịch vụ (subscription.finalPrice) — số tiền cần thu khi check-out
     *  lần ĐẦU TIÊN của gói này (áp dụng cho cả gói nhiều buổi lẫn "vãng lai" 1 buổi). */
    private BigDecimal subscriptionFinalPrice;
    /** UC-21: true nếu subscription này đã có hóa đơn (chưa bị hủy) — false nghĩa là buổi
     *  check-out này cần thu tiền trước (chỉ xảy ra ở lần check-out đầu tiên của gói). */
    private Boolean subscriptionInvoiced;
    private Long patientId;
    private String patientName;
    private String patientCode;
    private String patientPhone;
    private LocalDate patientDob;
    private String patientGender;
    private Long nurseId;
    private String nurseName;
    private Long roomId;
    private String roomName;
    private LocalDateTime scheduledDateTime;
    private String status;
    private Integer sessionNumber;
    private Integer totalSessions;
    private Integer remainingSessions;
    private String notes;
    private String nurseNotes;
    private Boolean checkedIn;
    private LocalDateTime checkInAt;
    private LocalDateTime startedAt;
    private LocalDateTime completedAt;
    /** Số phút thực hiện — tính từ startedAt/completedAt, null nếu chưa hoàn thành. */
    private Long durationMinutes;
    private Boolean isIncident;
    private LocalDateTime assignedAt;
    private LocalDateTime createdAt;
}
