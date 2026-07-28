package com.ecms.repository;

import com.ecms.entity.PayrollPeriod;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

/**
 * @author  ThangNB - HE201024
 * @created 2026-07-19
 * @updated 2026-07-19
 *
 * Data access for pay periods (UC-54 Approve Payroll).
 */
public interface PayrollPeriodRepository extends JpaRepository<PayrollPeriod, Long> {

    /**
     * Finds the period for a given month.
     *
     * Validate: one period per (year, month) — the draft generator uses this
     * lookup to reuse the existing period instead of creating a duplicate.
     *
     * @param year  pay period year
     * @param month pay period month, 1-12
     */
    Optional<PayrollPeriod> findByYearAndMonth(Integer year, Integer month);

    /** All pay periods, most recent month first. */
    List<PayrollPeriod> findAllByOrderByYearDescMonthDesc();
}
