// Entity ánh xạ bảng "staffs": hồ sơ nhân viên cho các role không có bảng riêng
// (RECEPTIONIST, PHARMACIST, NURSE, MANAGER, ADMIN).
// Bảng "doctors" và "lab_technicians" dùng cho DOCTOR/LAB_TECHNICIAN tương ứng.
package com.ecms.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "staffs")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Staff {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", unique = true, nullable = false)
    private User user;

    @Column(name = "employee_code", nullable = false, unique = true, length = 20)
    private String employeeCode;

    @Column(name = "full_name", columnDefinition = "NVARCHAR(100)", nullable = false)
    private String fullName;

    @Column(name = "department", columnDefinition = "NVARCHAR(100)")
    private String department;

    @Column(name = "position", columnDefinition = "NVARCHAR(100)", nullable = false)
    private String position;

    @Column(name = "phone_number", length = 20)
    private String phoneNumber;

    @Column(name = "hire_date")
    private LocalDate hireDate;

    @Column(name = "status", nullable = false, length = 20)
    private String status;

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        if (createdAt == null) createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
        if (status == null) status = "ACTIVE";
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
