package com.ecms.service;

import com.ecms.dto.request.EyeglassOrderRequest;
import com.ecms.dto.response.EyeglassOrderResponse;

import java.util.List;

import org.springframework.security.core.Authentication;

public interface EyeglassOrderService {
    EyeglassOrderResponse createOrder(EyeglassOrderRequest request, Authentication authentication);

    EyeglassOrderResponse getOrderById(Long id);

    List<EyeglassOrderResponse> getOrdersByPatient(Long patientId);

    List<EyeglassOrderResponse> getPendingOrders();

    EyeglassOrderResponse confirmOrderOnline(Long id);

    EyeglassOrderResponse dispenseOrder(Long id, String staffEmail);

    EyeglassOrderResponse updateOrder(Long id, EyeglassOrderRequest request);

    void cancelOrder(Long id, String cancelReason);

    List<EyeglassOrderResponse> getFabricationQueue();

    EyeglassOrderResponse startFabrication(Long id);

    EyeglassOrderResponse completeFabrication(Long id);

}
