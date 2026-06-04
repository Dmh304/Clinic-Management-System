package com.ecms.repository;

import com.ecms.entity.Doctor;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface DoctorRepository extends JpaRepository<Doctor, Long> {
    Optional<Doctor> findByEmail(String email);

    Optional<Doctor> findByUserId(Long userId);
}