package com.ecms.service;

import com.ecms.dto.request.PatientRequest;
import com.ecms.dto.response.PatientResponse;

public interface PatientService {

    PatientResponse createWalkInPatient(PatientRequest request);
}
