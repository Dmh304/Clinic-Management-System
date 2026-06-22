package com.ecms.repository;

import com.ecms.entity.PatientServiceSubscription;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface PatientServiceSubscriptionRepository extends JpaRepository<PatientServiceSubscription, Long> {

    List<PatientServiceSubscription> findByPatient_User_EmailOrderByCreatedAtDesc(String email);

    List<PatientServiceSubscription> findByPatient_IdAndStatusOrderByCreatedAtDesc(Long patientId, String status);

    List<PatientServiceSubscription> findByPatient_IdOrderByCreatedAtDesc(Long patientId);

    @Query("SELECT s FROM PatientServiceSubscription s WHERE s.patient.id = :patientId AND s.service.id = :serviceId AND s.status = 'ACTIVE'")
    List<PatientServiceSubscription> findActiveByPatientAndService(@Param("patientId") Long patientId, @Param("serviceId") Long serviceId);

    List<PatientServiceSubscription> findAllByOrderByCreatedAtDesc();
}
