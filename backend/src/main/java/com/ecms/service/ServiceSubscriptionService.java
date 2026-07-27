package com.ecms.service;

import com.ecms.dto.request.PurchaseServiceRequest;
import com.ecms.dto.response.DiscountCampaignResponse;
import com.ecms.dto.response.ServiceSubscriptionResponse;

import java.util.List;

public interface ServiceSubscriptionService {

    ServiceSubscriptionResponse purchase(PurchaseServiceRequest request, String currentUserEmail);

    List<ServiceSubscriptionResponse> getMySubscriptions(String currentUserEmail);

    /** Chi tiết 1 gói — patient chỉ xem được gói của chính mình, staff xem được mọi gói
     *  (tránh IDOR: đổi số ID trên URL để xem gói của bệnh nhân khác). */
    ServiceSubscriptionResponse getById(Long id, String currentUserEmail);

    List<ServiceSubscriptionResponse> getAllSubscriptions();

    List<ServiceSubscriptionResponse> getSubscriptionsByPatient(Long patientId);

    void cancelSubscription(Long id, String currentUserEmail);

    /**
     * Gia hạn một gói dịch vụ đã hết hạn nhưng còn buổi chưa dùng — không cần tư vấn
     * lại vì bệnh nhân đã từng đăng ký/sử dụng gói này rồi (khác với mua gói MỚI).
     */
    ServiceSubscriptionResponse renewSubscription(Long id, String currentUserEmail);

    DiscountCampaignResponse validateDiscountCode(String code, java.math.BigDecimal amount);
}
