package com.ecms.service;

import com.ecms.dto.request.PatientRequest;
import com.ecms.dto.response.PatientResponse;

import java.util.List;

public interface PatientService {

    PatientResponse createWalkInPatient(PatientRequest request);

    List<PatientResponse> searchPatients(String keyword);
}
