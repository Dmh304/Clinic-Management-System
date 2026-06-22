package com.ecms.service;

import com.ecms.dto.request.PrescriptionRequest;
import com.ecms.dto.response.PrescriptionResponse;

import java.util.List;

public interface PrescriptionService {
    PrescriptionResponse createPrescription(PrescriptionRequest request, String doctorEmail);
    List<PrescriptionResponse> getPatientPrescriptions(Long patientId);
    List<PrescriptionResponse> getPendingPrescriptions();
    PrescriptionResponse dispensePrescription(Long id);
    PrescriptionResponse skipPrescription(Long id);
}
