package com.ecms.repository;

import com.ecms.entity.PayrollPeriod;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

/**
 * UC-54: Truy vấn kỳ lương.
 */
public interface PayrollPeriodRepository extends JpaRepository<PayrollPeriod, Long> {

    Optional<PayrollPeriod> findByYearAndMonth(Integer year, Integer month);

    List<PayrollPeriod> findAllByOrderByYearDescMonthDesc();
}
