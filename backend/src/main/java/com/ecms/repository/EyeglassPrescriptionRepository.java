//Author: DucTKH - HE204463
//Created: 2026-06-01
//Last Update: 2026-07-21
// Repository cho Entity EyeglassPrescription, truy vấn dữ liệu đơn kính.
package com.ecms.repository;

import com.ecms.entity.EyeglassPrescription;
import com.ecms.entity.EyeglassPrescriptionStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface EyeglassPrescriptionRepository extends JpaRepository<EyeglassPrescription, Long> {
    List<EyeglassPrescription> findByPatientIdOrderByCreatedAtDesc(Long patientId);

    List<EyeglassPrescription> findByMedicalRecordId(Long medicalRecordId);

    List<EyeglassPrescription> findByStatusOrderByCreatedAtAsc(EyeglassPrescriptionStatus status);

    List<EyeglassPrescription> findByStatusInOrderByCreatedAtAsc(List<EyeglassPrescriptionStatus> statuses);
}
