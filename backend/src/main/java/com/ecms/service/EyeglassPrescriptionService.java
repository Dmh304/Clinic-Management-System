package com.ecms.service;

import com.ecms.dto.request.EyeglassPrescriptionRequest;
import com.ecms.dto.response.EyeglassPrescriptionResponse;

import java.util.List;

public interface EyeglassPrescriptionService {
    EyeglassPrescriptionResponse createPrescription(EyeglassPrescriptionRequest request, String doctorEmail);
    List<EyeglassPrescriptionResponse> getPatientPrescriptions(Long patientId);
    List<EyeglassPrescriptionResponse> getByMedicalRecordId(Long medicalRecordId);
    List<EyeglassPrescriptionResponse> getPendingPrescriptions();
    EyeglassPrescriptionResponse dispensePrescription(Long id);
    EyeglassPrescriptionResponse skipPrescription(Long id);
}
