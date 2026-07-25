package com.ecms.service;

import com.ecms.dto.request.EyeglassPrescriptionRequest;
import com.ecms.dto.response.EyeglassPrescriptionResponse;

import java.util.List;

public interface EyeglassPrescriptionService {
    EyeglassPrescriptionResponse getById(Long id);

    List<EyeglassPrescriptionResponse> getFabricationQueue();

    EyeglassPrescriptionResponse startFabrication(Long id);

    EyeglassPrescriptionResponse completeFabrication(Long id);

    EyeglassPrescriptionResponse createPrescription(EyeglassPrescriptionRequest request, String doctorEmail);

    EyeglassPrescriptionResponse updatePrescription(Long id, EyeglassPrescriptionRequest request, String doctorEmail);

    void deletePrescription(Long id, String doctorEmail);

    List<EyeglassPrescriptionResponse> getPatientPrescriptions(Long patientId);

    List<EyeglassPrescriptionResponse> getByMedicalRecordId(Long medicalRecordId);

    List<EyeglassPrescriptionResponse> getPendingPrescriptions();

    EyeglassPrescriptionResponse dispensePrescription(Long id);

    EyeglassPrescriptionResponse skipPrescription(Long id);

    List<EyeglassPrescriptionResponse> getReadyPrescriptions();
}
