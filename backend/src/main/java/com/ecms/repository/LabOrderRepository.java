package com.ecms.repository;

import java.util.function.LongSupplier;

import org.springframework.data.jpa.repository.JpaRepository;

import com.ecms.entity.LabOrder;
import com.ecms.entity.LabResult;

import java.util.List;
import java.util.Optional;

public interface LabOrderRepository extends JpaRepository<LabOrder, Long> {
    List<LabOrder> findByMedicalRecord_PatientIdOrderByCreatedAtDesc(Long patientId);

    List<LabOrder> findByMedicalRecord_DoctorIdOrderByCreatedAtDesc(Long doctorId);

    List<LabOrder> findByDoctorIdOrderByCreatedAtDesc(Long doctorId);

    List<LabOrder> findByMedicalRecordIdOrderByCreatedAtDesc(Long medicalRecordId);

    List<LabOrder> findByLabTechnicianIdOrderByCreatedAtDesc(Long labTechnicianId);
}
