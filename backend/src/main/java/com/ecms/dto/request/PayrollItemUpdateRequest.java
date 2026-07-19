package com.ecms.dto.request;

import lombok.Data;

import java.math.BigDecimal;

/**
 * UC-54: Quản lý điều chỉnh một dòng lương (kèm ghi chú lý do).
 */
@Data
public class PayrollItemUpdateRequest {
    private BigDecimal baseSalary;
    private BigDecimal performanceBonus;
    private BigDecimal deduction;
    private String note;
}
