package com.ecms.service.impl;

import java.util.List;
import java.util.Optional;

import org.springframework.stereotype.Service;

import com.ecms.entity.MedicalRecord;
import com.ecms.repository.MedicalRecordRepository;
import com.ecms.service.EMRService;

import jakarta.transaction.Transactional;

@Service
public class EMRServiceImpl implements EMRService {
    private final MedicalRecordRepository medicalRecordRepository;

    public EMRServiceImpl(MedicalRecordRepository medicalRecordRepository) {
        this.medicalRecordRepository = medicalRecordRepository;
    }

    @Override
    public List<MedicalRecord> getHistoryByPatientId(Long patientId) {
        return medicalRecordRepository.findByPatientIdOrderByCreatedAtDesc(patientId);
    }

    @Override
    @Transactional
    public MedicalRecord saveOrUpdateRecord(MedicalRecord inputRecord) {
        Optional<MedicalRecord> existingRecord = medicalRecordRepository
                .findByAppointmentId(inputRecord.getAppointment().getId());

        if (existingRecord.isPresent()) {
            MedicalRecord recordToUpdate = existingRecord.get();

            recordToUpdate.setChiefComplaint(inputRecord.getChiefComplaint());
            recordToUpdate.setSymptoms(inputRecord.getSymptoms());
            recordToUpdate.setDiagnosis(inputRecord.getDiagnosis());
            recordToUpdate.setTreatmentPlan(inputRecord.getTreatmentPlan());
            recordToUpdate.setNotes(inputRecord.getNotes());

            recordToUpdate.setVaL(inputRecord.getVaL());
            recordToUpdate.setVaR(inputRecord.getVaR());
            recordToUpdate.setBcvaL(inputRecord.getBcvaL());
            recordToUpdate.setBcvaR(inputRecord.getBcvaR());
            recordToUpdate.setSphL(inputRecord.getSphL());
            recordToUpdate.setSphR(inputRecord.getSphR());
            recordToUpdate.setCylL(inputRecord.getCylL());
            recordToUpdate.setCylR(inputRecord.getCylR());
            recordToUpdate.setAxisL(inputRecord.getAxisL());
            recordToUpdate.setAxisR(inputRecord.getAxisR());
            recordToUpdate.setIopL(inputRecord.getIopL());
            recordToUpdate.setIopR(inputRecord.getIopR());

            recordToUpdate.setTotalAmount(inputRecord.getTotalAmount());
            recordToUpdate.setStatus(inputRecord.getStatus());

            return medicalRecordRepository.save(recordToUpdate);
        } else {
            if (inputRecord.getStatus() == null) {
                inputRecord.setStatus("PROCESSING");
            }
            return medicalRecordRepository.save(inputRecord);
        }
    }
}