package com.ecms.repository;

import com.ecms.entity.PayrollItem;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

/**
 * UC-54: Truy vấn dòng lương.
 */
public interface PayrollItemRepository extends JpaRepository<PayrollItem, Long> {

    List<PayrollItem> findByPeriod_IdOrderByStaffTypeAscStaffNameAsc(Long periodId);
}
