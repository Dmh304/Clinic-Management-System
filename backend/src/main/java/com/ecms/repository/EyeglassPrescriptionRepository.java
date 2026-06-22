package com.ecms.repository;

import com.ecms.entity.EyeglassPrescription;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface EyeglassPrescriptionRepository extends JpaRepository<EyeglassPrescription, Long> {
    List<EyeglassPrescription> findByPatientIdOrderByCreatedAtDesc(Long patientId);
}
