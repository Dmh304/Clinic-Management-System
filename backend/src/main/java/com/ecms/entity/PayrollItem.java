package com.ecms.entity;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;

/**
 * UC-54: Một dòng lương của một nhân viên trong một kỳ lương.
 * Lưu generic theo staffType + staffRefId để gộp được cả bác sĩ (bảng doctors)
 * lẫn nhân viên khác (bảng staffs) mà không ràng buộc khóa ngoại cứng.
 * Khi kỳ lương APPROVED thì locked = true, không cho sửa (BR-09/BR-17).
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

    // DOCTOR | STAFF
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

    // Số lượt hoạt động ghi nhận trong kỳ (vd số lượt khám hoàn thành của bác sĩ)
    @Column(name = "activity_count")
    private Integer activityCount;

    @Column(name = "performance_bonus", precision = 14, scale = 2)
    private BigDecimal performanceBonus;

    @Column(name = "deduction", precision = 14, scale = 2)
    private BigDecimal deduction;

    @Column(name = "net_pay", precision = 14, scale = 2)
    private BigDecimal netPay;

    @Column(name = "note", columnDefinition = "NVARCHAR(MAX)")
    private String note;

    @Column(name = "locked", nullable = false)
    private Boolean locked;

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
