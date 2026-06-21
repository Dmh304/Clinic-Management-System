package com.ecms.entity;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "patient_service_subscriptions")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class PatientServiceSubscription {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "patient_id", nullable = false)
    private Patient patient;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "service_id", nullable = false)
    private ClinicService service;

    @Column(name = "total_sessions", nullable = false)
    private Integer totalSessions;

    @Column(name = "used_sessions", nullable = false)
    private Integer usedSessions;

    @Column(name = "purchase_date", nullable = false)
    private LocalDate purchaseDate;

    @Column(name = "expiry_date")
    private LocalDate expiryDate;

    /** ACTIVE | EXPIRED | DEPLETED | CANCELLED */
    @Column(name = "status", length = 20, nullable = false)
    private String status;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "discount_id")
    private DiscountCampaign discount;

    /** Giá sau khi áp dụng giảm giá */
    @Column(name = "final_price")
    private BigDecimal finalPrice;

    @Column(columnDefinition = "NVARCHAR(500)")
    private String notes;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    public Integer getRemainingSessions() {
        return totalSessions - usedSessions;
    }

    @PrePersist
    private void prePersist() {
        this.createdAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
        if (this.usedSessions == null) this.usedSessions = 0;
        if (this.status == null) this.status = "ACTIVE";
        if (this.purchaseDate == null) this.purchaseDate = LocalDate.now();
    }

    @PreUpdate
    private void preUpdate() {
        this.updatedAt = LocalDateTime.now();
    }
}
