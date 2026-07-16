package com.ecms.repository;

import com.ecms.entity.EyeglassOrder;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface EyeglassOrderRepository extends JpaRepository<EyeglassOrder, Long> {
    List<EyeglassOrder> findByPatientIdOrderByCreatedAtDesc(Long patientId);
    List<EyeglassOrder> findByStatus(String status);
}
