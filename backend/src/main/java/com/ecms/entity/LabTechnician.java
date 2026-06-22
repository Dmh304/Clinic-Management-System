package com.ecms.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "lab_technicians")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class LabTechnician {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", unique = true)
    private User user;

    @Column(name = "full_name", nullable = false)
    private String fullName;

    @Column(name = "specialty")
    private String specialization;

    @Column(name = "phone")
    private String phone;

    @Column(name = "email")
    private String email;
}
