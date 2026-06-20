package com.ecms.repository;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.ecms.entity.LabTechnician;

@Repository
public interface LabTechnicianRepository extends JpaRepository<LabTechnician, Long> {
    Optional<LabTechnician> findByEmail(String email);
}
