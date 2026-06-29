package com.ecms.repository;

import com.ecms.entity.ClinicService;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ClinicServiceRepository extends JpaRepository<ClinicService, Long> {
    List<ClinicService> findByIsActiveTrueOrderByIsPopularDescDisplayOrderAsc();
    List<ClinicService> findByCategory_IdAndIsActiveTrueOrderByIsPopularDescDisplayOrderAsc(Long categoryId);
    List<ClinicService> findByServiceTypeAndIsActiveTrueOrderByIsPopularDescDisplayOrderAsc(String serviceType);

    // Tất cả gói (kể cả đã ẩn) — dùng cho màn Quản lý gói dịch vụ để khôi phục gói đã ẩn
    List<ClinicService> findAllByOrderByIsPopularDescDisplayOrderAsc();

    @Query("SELECT MAX(s.displayOrder) FROM ClinicService s")
    Optional<Integer> findMaxDisplayOrder();
}
