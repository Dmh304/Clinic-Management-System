package com.ecms.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

/**
 * UC-54: Kỳ lương (theo tháng). Trạng thái: DRAFT (đang soạn) | APPROVED (đã duyệt, khóa).
 * Bảng tự tạo bởi Hibernate (ddl-auto=update).
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

    // DRAFT | APPROVED
    @Column(name = "status", nullable = false, length = 20)
    private String status;

    @Column(name = "approved_by")
    private Long approvedBy;

    @Column(name = "approved_at")
    private LocalDateTime approvedAt;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Builder.Default
    @OneToMany(mappedBy = "period", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    private List<PayrollItem> items = new ArrayList<>();

    @PrePersist
    protected void onCreate() {
        if (createdAt == null) createdAt = LocalDateTime.now();
        if (status == null) status = "DRAFT";
    }
}
