package com.ecms.service;

import java.util.List;

import com.ecms.entity.MedicalRecord;

public interface EMRService {
    List<MedicalRecord> getHistoryByPatientId(Long patientId);

    MedicalRecord saveOrUpdateRecord(MedicalRecord inputRecord);
}
