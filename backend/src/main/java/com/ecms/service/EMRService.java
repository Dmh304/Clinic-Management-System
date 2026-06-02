package com.ecms.service;

import com.ecms.dto.request.EMRRequest;
import com.ecms.dto.response.EMRResponse;

import java.util.List;

public interface EMRService {

    EMRResponse saveEMR(EMRRequest request);

    EMRResponse getByAppointmentId(Long appointmentId);

    List<EMRResponse> getPatientHistory(Long patientId);
}
