package com.ecms.repository;

import com.ecms.entity.MedicalRecord;
import com.ecms.entity.MedicalRecordStatus;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface MedicalRecordRepository extends JpaRepository<MedicalRecord, Long> {

    Optional<MedicalRecord> findByAppointmentId(Long appointmentId);

    @Query("""
                SELECT m FROM MedicalRecord m
                LEFT JOIN FETCH m.appointment a
                LEFT JOIN FETCH m.doctor d
                WHERE m.patient.id = :patientId
                ORDER BY m.createdAt DESC
            """)
    List<MedicalRecord> findByPatientIdOrderByCreatedAtDesc(@Param("patientId") Long patientId);

    List<MedicalRecord> findByStatusOrderByCreatedAtDesc(MedicalRecordStatus status);

    List<MedicalRecord> findByStatusAndDoctorIdOrderByCreatedAtDesc(MedicalRecordStatus status, Long doctorId);

    Optional<MedicalRecord> findById(Long id);

    List<MedicalRecord> findAllByOrderByCreatedAtDesc();
}
