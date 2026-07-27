package com.ecms.entity;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;

/**
 * @author  ThangNB - HE201024
 * @created 2026-07-19
 * @updated 2026-07-19
 *
 * One staff member's pay line within a period (UC-54 Approve Payroll).
 *
 * Identity is stored generically as {@code staffType} + {@code staffRefId}
 * rather than a hard foreign key, so doctors (doctors table), lab technicians
 * (lab_technicians table) and other staff (staffs table) can share one payroll
 * table.
 *
 * Business rules: BR-09 / BR-17 — when the period is APPROVED every line is
 * flagged {@code locked} and becomes read-only.
 */
@Entity
@Table(name = "payroll_items")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PayrollItem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "payroll_period_id", nullable = false)
    private PayrollPeriod period;

    /** DOCTOR | STAFF | LAB_TECHNICIAN — selects which table {@code staffRefId}
     *  points into. */
    @Column(name = "staff_type", nullable = false, length = 20)
    private String staffType;

    @Column(name = "staff_ref_id", nullable = false)
    private Long staffRefId;

    @Column(name = "staff_name")
    private String staffName;

    @Column(name = "role")
    private String role;

    @Column(name = "base_salary", precision = 14, scale = 2)
    private BigDecimal baseSalary;

    /** Activity recorded in the period, e.g. consultations a doctor completed —
     *  the performance-linked input described in UC-54 normal flow step 2. */
    @Column(name = "activity_count")
    private Integer activityCount;

    @Column(name = "performance_bonus", precision = 14, scale = 2)
    private BigDecimal performanceBonus;

    @Column(name = "deduction", precision = 14, scale = 2)
    private BigDecimal deduction;

    /** Amount payable = baseSalary + performanceBonus − deduction. */
    @Column(name = "net_pay", precision = 14, scale = 2)
    private BigDecimal netPay;

    /** Net pay as the system computed it at draft generation — the baseline for the
     *  UC-54 E-1 variance check, so a series of small edits cannot drift arbitrarily
     *  far without ever tripping the threshold.
     *  Nullable on purpose: a NOT NULL column would make ddl-auto=update fail to add
     *  it to an existing table. */
    @Column(name = "system_net_pay", precision = 14, scale = 2)
    private BigDecimal systemNetPay;

    /** Justification for any manual adjustment (UC-54 E-1). */
    @Column(name = "note", columnDefinition = "NVARCHAR(MAX)")
    private String note;

    /** Set when the period is approved.
     *  Validate: BR-09 / UC-54 POST-2 — a locked line rejects further edits
     *  and is never hard-deleted. */
    @Column(name = "locked", nullable = false)
    private Boolean locked;

    /**
     * Fills defaults before INSERT.
     *
     * Validate: BR-09 — a new line starts unlocked so the Manager can still
     * review it; money columns default to 0 rather than NULL so the net pay
     * arithmetic stays well defined.
     */
    @PrePersist
    protected void onCreate() {
        if (locked == null) locked = false;
        if (baseSalary == null) baseSalary = BigDecimal.ZERO;
        if (performanceBonus == null) performanceBonus = BigDecimal.ZERO;
        if (deduction == null) deduction = BigDecimal.ZERO;
        if (netPay == null) netPay = BigDecimal.ZERO;
        if (activityCount == null) activityCount = 0;
    }
}
