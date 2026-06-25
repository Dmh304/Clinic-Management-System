package com.ecms.repository;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.ecms.entity.LabResult;

public interface LabResultRepository extends JpaRepository<LabResult, Long> {
    Optional<LabResult> findByLabOrderId(Long labOrderId);

}
