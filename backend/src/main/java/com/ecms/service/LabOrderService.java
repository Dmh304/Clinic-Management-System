package com.ecms.service;

import java.util.List;

import com.ecms.dto.request.LabOrderRequest;
import com.ecms.dto.request.LabResultRequest;
import com.ecms.dto.response.LabOrderResponse;
import com.ecms.dto.response.LabResultResponse;

public interface LabOrderService {
    LabOrderResponse createLabOrder(LabOrderRequest request, Long doctorId);

    List<LabOrderResponse> getLabQueue(Long labTechnicianId);

    LabOrderResponse submitLabResult(Long labOrderId, LabResultRequest request, Long labTechnicianId);

    List<LabOrderResponse> getLabOrdersForMedicalRecord(Long medicalRecordId);

    LabResultResponse getLabResults(Long labOrderId, Long currentUserId, String currentUserRole);

    LabOrderResponse approveLabResult(Long labOrderId, Long doctorId);

    LabOrderResponse requestRetest(Long labOrderId, Long doctorId, LabOrderRequest request);
}
