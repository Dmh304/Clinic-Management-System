package com.ecms.service;

import com.ecms.dto.request.PurchaseServiceRequest;
import com.ecms.dto.response.DiscountCampaignResponse;
import com.ecms.dto.response.ServiceSubscriptionResponse;

import java.util.List;

public interface ServiceSubscriptionService {

    ServiceSubscriptionResponse purchase(PurchaseServiceRequest request, String currentUserEmail);

    List<ServiceSubscriptionResponse> getMySubscriptions(String currentUserEmail);

    ServiceSubscriptionResponse getById(Long id);

    List<ServiceSubscriptionResponse> getAllSubscriptions();

    List<ServiceSubscriptionResponse> getSubscriptionsByPatient(Long patientId);

    void cancelSubscription(Long id, String currentUserEmail);

    DiscountCampaignResponse validateDiscountCode(String code, java.math.BigDecimal amount);
}
