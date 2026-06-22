package com.ecms.repository;

import com.ecms.entity.Prescription;
import com.ecms.entity.PrescriptionStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface PrescriptionRepository extends JpaRepository<Prescription, Long> {
    List<Prescription> findByPatientIdOrderByCreatedAtDesc(Long patientId);
    List<Prescription> findByStatusOrderByCreatedAtAsc(PrescriptionStatus status);
}
