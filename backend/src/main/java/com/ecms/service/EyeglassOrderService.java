package com.ecms.service;

import com.ecms.dto.request.EyeglassOrderRequest;
import com.ecms.dto.response.EyeglassOrderResponse;

import java.util.List;

public interface EyeglassOrderService {
    EyeglassOrderResponse createOrder(EyeglassOrderRequest request);
    EyeglassOrderResponse getOrderById(Long id);
    List<EyeglassOrderResponse> getOrdersByPatient(Long patientId);
    List<EyeglassOrderResponse> getPendingOrders();
    EyeglassOrderResponse dispenseOrder(Long id, String staffEmail);
}
