package com.ecms.repository;

import com.ecms.entity.ClinicService;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ClinicServiceRepository extends JpaRepository<ClinicService, Long> {
    List<ClinicService> findByIsActiveTrueOrderByDisplayOrderAsc();
    List<ClinicService> findByCategory_IdAndIsActiveTrueOrderByDisplayOrderAsc(Long categoryId);
    List<ClinicService> findByServiceTypeAndIsActiveTrueOrderByDisplayOrderAsc(String serviceType);
}
