package com.ecms.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

/**
 * @author  ThangNB - HE201024
 * @created 2026-07-19
 * @updated 2026-07-19
 *
 * One monthly pay period (UC-54 Approve Payroll).
 * Status: DRAFT (being prepared) | APPROVED (signed off and locked).
 * Table created by Hibernate under ddl-auto=update.
 *
 * Business rules: BR-17 (only the Clinic Manager may approve), BR-09
 * (an approved period's lines are locked, never deleted).
 */
@Entity
@Table(name = "payroll_periods")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PayrollPeriod {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "period_year", nullable = false)
    private Integer year;

    @Column(name = "period_month", nullable = false)
    private Integer month;

    /** DRAFT | APPROVED.
     *  Validate: BR-09 / UC-54 POST-2 — leaving DRAFT is one-way; once
     *  APPROVED the period and its lines can no longer be edited. */
    @Column(name = "status", nullable = false, length = 20)
    private String status;

    /** Manager who approved the period.
     *  Validate: BR-17 — recorded so the approval is attributable in the
     *  Audit Log (UC-54 POST-4). */
    @Column(name = "approved_by")
    private Long approvedBy;

    @Column(name = "approved_at")
    private LocalDateTime approvedAt;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Builder.Default
    @OneToMany(mappedBy = "period", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    private List<PayrollItem> items = new ArrayList<>();

    /**
     * Fills defaults before INSERT.
     *
     * Validate: BR-17 — a new period always starts DRAFT, never APPROVED, so
     * payroll can only be approved through the explicit approve action by a
     * Clinic Manager.
     */
    @PrePersist
    protected void onCreate() {
        if (createdAt == null) createdAt = LocalDateTime.now();
        if (status == null) status = "DRAFT";
    }
}
