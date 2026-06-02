package com.ecms.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.ecms.entity.MedicalRecord;

@Repository
public interface MedicalRecordRepository extends JpaRepository<MedicalRecord, Long> {
    public List<MedicalRecord> findByPatientIdOrderByCreatedAtDesc(Long patientId);

    Optional<MedicalRecord> findByAppointmentId(Long appointmentId);
}