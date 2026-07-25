//Author: DucTKH - HE204463
//Created: 2026-06-22
//Last Update: 2026-07-23

package com.ecms.entity;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Set;

@Entity
@Table(name = "eyeglass_orders")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class EyeglassOrder {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "patient_id", nullable = false)
    private Patient patient;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "prescription_id", nullable = false)
    private EyeglassPrescription prescription;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "frame_id")
    private EyeglassFrame frame;

    @Enumerated(EnumType.STRING)
    @Column(length = 25)
    private EyeglassOrderStatus status;

    @Column(name = "total_amount", precision = 15, scale = 2, nullable = false)
    private BigDecimal totalAmount;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "dispensed_by")
    private User dispensedBy;

    @Column(name = "dispensed_at")
    private LocalDateTime dispensedAt;

    @Column(name = "cancel_reason", columnDefinition = "TEXT")
    private String cancelReason;

    @ManyToMany(fetch = FetchType.LAZY)
    @JoinTable(name = "eyeglass_order_coatings", joinColumns = @JoinColumn(name = "order_id"), inverseJoinColumns = @JoinColumn(name = "coating_id"))
    private Set<EyeglassCoating> coatings;

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
