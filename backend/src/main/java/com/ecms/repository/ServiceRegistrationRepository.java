package com.ecms.repository;

import com.ecms.entity.ServiceRegistration;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ServiceRegistrationRepository extends JpaRepository<ServiceRegistration, Long> {
    List<ServiceRegistration> findByPatient_User_EmailOrderByCreatedAtDesc(String email);
    List<ServiceRegistration> findAllByOrderByCreatedAtDesc();
}
