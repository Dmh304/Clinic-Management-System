package com.ecms.repository;

import com.ecms.entity.PayrollItem;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

/**
 * @author  ThangNB - HE201024
 * @created 2026-07-19
 * @updated 2026-07-19
 *
 * Data access for payroll line items (UC-54 Approve Payroll).
 */
public interface PayrollItemRepository extends JpaRepository<PayrollItem, Long> {

    /**
     * Lines of one pay period, grouped by staff type then name so the review
     * table reads in a stable order every time it is opened.
     *
     * @param periodId pay period primary key
     * @return that period's payroll lines
     */
    List<PayrollItem> findByPeriod_IdOrderByStaffTypeAscStaffNameAsc(Long periodId);
}
