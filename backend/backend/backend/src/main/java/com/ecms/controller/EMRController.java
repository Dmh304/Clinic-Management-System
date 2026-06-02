package com.ecms.controller;

import java.util.List;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.ecms.entity.MedicalRecord;
import com.ecms.service.impl.EMRServiceImpl;

@RestController
@RequestMapping("/api/v1/emr")
@CrossOrigin(origins = "*")
public class EMRController {
    private final EMRServiceImpl emrServiceImpl;

    public EMRController(EMRServiceImpl emrServiceImpl) {
        this.emrServiceImpl = emrServiceImpl;
    }

    @GetMapping("/history/{patientId}")
    public ResponseEntity<List<MedicalRecord>> getPatientHistory(@PathVariable Long patientId) {
        List<MedicalRecord> history = emrServiceImpl.getHistoryByPatientId(patientId);
        return ResponseEntity.ok(history);
    }

    @PostMapping("/save")
    public ResponseEntity<MedicalRecord> saveOrUpdateRecord(@RequestBody MedicalRecord medicalRecord) {
        MedicalRecord savedRecord = emrServiceImpl.saveOrUpdateRecord(medicalRecord);
        return ResponseEntity.ok(savedRecord);
    }

}
