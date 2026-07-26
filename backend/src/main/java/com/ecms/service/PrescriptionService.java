package com.ecms.service;

import com.ecms.dto.request.PrescriptionRequest;
import com.ecms.dto.request.DispenseRequest;
import com.ecms.dto.response.PrescriptionResponse;

import java.util.List;

public interface PrescriptionService {
    PrescriptionResponse createPrescription(PrescriptionRequest request, String doctorUsername);
    PrescriptionResponse updatePrescription(Long id, PrescriptionRequest request, String doctorUsername);
    List<PrescriptionResponse> getPatientPrescriptions(Long patientId);
    List<PrescriptionResponse> getByMedicalRecordId(Long medicalRecordId);
    List<PrescriptionResponse> getPendingPrescriptions();
    List<PrescriptionResponse> getAllPrescriptions();
    PrescriptionResponse dispensePrescription(Long prescriptionId, DispenseRequest request, String dispenserEmail);
    PrescriptionResponse skipPrescription(Long prescriptionId);
    void deletePrescription(Long id);
    byte[] generatePrescriptionPdf(Long id, boolean hideSignature);
}
