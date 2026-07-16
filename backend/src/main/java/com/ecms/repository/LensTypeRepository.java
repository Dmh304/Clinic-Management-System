package com.ecms.repository;

import com.ecms.entity.LensType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface LensTypeRepository extends JpaRepository<LensType, Long> {
    List<LensType> findByStatus(String status);
}
