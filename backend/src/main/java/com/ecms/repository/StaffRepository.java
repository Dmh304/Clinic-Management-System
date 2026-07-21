package com.ecms.repository;

import com.ecms.entity.Staff;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface StaffRepository extends JpaRepository<Staff, Long> {
    Optional<Staff> findByUserId(Long userId);

    boolean existsByUserId(Long userId);

    List<Staff> findByPositionIgnoreCaseAndStatus(String position, String status);

    List<Staff> findByStatus(String status);
}
