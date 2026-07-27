package com.ecms.service;

import com.ecms.dto.request.PayrollItemUpdateRequest;

import java.util.List;
import java.util.Map;

/**
 * @author  ThangNB - HE201024
 * @created 2026-07-19
 * @updated 2026-07-19
 *
 * Payroll approval contract, one period per calendar month
 * (UC-54 Approve Payroll).
 *
 * Business rules: BR-17 (only the Clinic Manager may approve a payroll
 * period), BR-09 (once APPROVED, line items are locked and never deleted).
 */
public interface PayrollService {

    /**
     * Generates — or regenerates — the DRAFT payroll for a period from the
     * activity data already captured by the system (UC-54 normal flow step 2).
     *
     * @param year  pay period year
     * @param month pay period month, 1-12
     * @return the draft period with its line items
     *
     * Validate: BR-09 / UC-54 POST-2 — an already APPROVED period must not be
     * regenerated, since its lines are locked.
     */
    Map<String, Object> generateDraft(int year, int month);

    /**
     * Lists pay periods, newest first.
     *
     * @return period summaries
     */
    List<Map<String, Object>> listPeriods();

    /**
     * Loads one pay period together with its line items.
     *
     * @param periodId pay period primary key
     * @return the period and its lines
     */
    Map<String, Object> getPeriod(Long periodId);

    /**
     * Adjusts a single payroll line, with a justification note
     * (UC-54 normal flow step 3).
     *
     * @param itemId  payroll line primary key
     * @param request the amounts to override plus the reason
     * @return the updated line
     *
     * Validate: BR-09 — editing is only permitted while the period is DRAFT;
     * once APPROVED the lines are locked (UC-54 POST-2).
     */
    Map<String, Object> updateItem(Long itemId, PayrollItemUpdateRequest request);

    /**
     * Approves the payroll period: status → APPROVED, all lines locked, event
     * written to the Audit Log (UC-54 normal flow steps 4-7).
     *
     * @param periodId    pay period primary key
     * @param actorUserId the approving manager, recorded in the audit entry
     * @return the approved period
     *
     * Validate: BR-17 — approval authority is restricted to the Clinic
     * Manager; BR-09 — approval is irreversible, lines can no longer be edited
     * or removed.
     */
    Map<String, Object> approve(Long periodId, Long actorUserId);
}
