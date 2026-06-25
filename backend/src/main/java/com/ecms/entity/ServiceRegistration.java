package com.ecms.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "service_registrations")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class ServiceRegistration {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "service_id", nullable = false)
    private ClinicService service;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "patient_id", nullable = false)
    private Patient patient;

    // The person who created the registration (patient themselves or a receptionist)
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "registered_by", nullable = false)
    private User registeredBy;

    @Column(name = "registration_date")
    private LocalDate registrationDate;

    // PENDING | CONFIRMED | COMPLETED | CANCELLED
    @Column(name = "status", length = 20)
    private String status;

    @Column(columnDefinition = "NVARCHAR(500)")
    private String notes;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @PrePersist
    private void prePersist() {
        this.createdAt = LocalDateTime.now();
        if (this.registrationDate == null) this.registrationDate = LocalDate.now();
        if (this.status == null) this.status = "PENDING";
    }
}
