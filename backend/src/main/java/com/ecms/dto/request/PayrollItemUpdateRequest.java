package com.ecms.dto.request;

import lombok.Data;

import java.math.BigDecimal;

/**
 * @author  ThangNB - HE201024
 * @created 2026-07-19
 * @updated 2026-07-19
 *
 * Manager override of one payroll line, with the justification that must
 * accompany it (UC-54 normal flow step 3).
 */
@Data
public class PayrollItemUpdateRequest {

    /** Overridden base salary for the period. */
    private BigDecimal baseSalary;

    /** Overridden performance-linked component. */
    private BigDecimal performanceBonus;

    /** Overridden deduction. */
    private BigDecimal deduction;

    /** Reason for the adjustment.
     *  Validate: UC-54 E-1 — an adjustment beyond the configured variance
     *  threshold requires a justification note before it can be saved, and the
     *  note is what makes the change defensible in the audit trail (BR-09). */
    private String note;
}
