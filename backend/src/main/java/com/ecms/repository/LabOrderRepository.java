package com.ecms.repository;

import java.util.function.LongSupplier;

import org.springframework.data.jpa.repository.JpaRepository;

import com.ecms.entity.LabOrder;
import java.util.List;

public interface LabOrderRepository extends JpaRepository<LabOrder, Long> {
    List<LabOrder> findByMedicalRecord_PatientId(Long patientId);

    List<LabOrder> findByMedicalRecord_DoctorId(Long doctorId);

    List<LabOrder> findByMedicalRecordId(Long medicalRecordId);

    List<LabOrder> findByLabTechnicianId(Long labTechnicianId);
}
