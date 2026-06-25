package com.ecms.service;

import com.ecms.dto.request.PrescriptionRequest;
import com.ecms.dto.request.DispenseRequest;
import com.ecms.dto.response.PrescriptionResponse;

import java.util.List;

public interface PrescriptionService {
    PrescriptionResponse createPrescription(PrescriptionRequest request, String doctorUsername);
    List<PrescriptionResponse> getPatientPrescriptions(Long patientId);
    List<PrescriptionResponse> getPendingPrescriptions();
    PrescriptionResponse dispensePrescription(Long prescriptionId, DispenseRequest request);
    PrescriptionResponse skipPrescription(Long prescriptionId);
    void deletePrescription(Long id);
}
