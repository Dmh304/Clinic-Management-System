package com.ecms.dto.response;

import lombok.*;

/**
 * Kết quả của registerAndBookOnline() — 2 khả năng:
 *  - requiresConsultation = true: lần ĐẦU bệnh nhân đăng ký dịch vụ này, chỉ tạo
 *    ServiceRegistration PENDING, CHƯA tạo subscription/care-session — chờ lễ tân
 *    liên hệ tư vấn rồi xử lý tiếp qua scheduleClinicVisit().
 *  - requiresConsultation = false: bệnh nhân đã từng mua dịch vụ này rồi, được tự
 *    đặt lịch ngay như cũ — subscription + careSession đã tạo xong.
 */
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class RegisterAndBookResponse {
    private boolean requiresConsultation;
    private ServiceRegistrationResponse registration;
    private CareSessionResponse careSession;
}
