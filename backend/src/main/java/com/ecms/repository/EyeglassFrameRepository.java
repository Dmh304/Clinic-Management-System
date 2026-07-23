package com.ecms.repository;

import com.ecms.entity.EyeglassFrame;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface EyeglassFrameRepository extends JpaRepository<EyeglassFrame, Long> {
    List<EyeglassFrame> findByStatus(String status);
}
