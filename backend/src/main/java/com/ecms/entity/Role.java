// Mạnh Hùng - HE200743
// Entity ánh xạ bảng "roles" trong database.
// Lưu trữ các vai trò trong hệ thống: PATIENT, DOCTOR, RECEPTIONIST, LAB_TECHNICIAN, PHARMACIST, MANAGER, ADMIN.
package com.ecms.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "roles")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Role {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "role_name", unique = true, nullable = false, length = 50)
    private String name; // PATIENT | DOCTOR | RECEPTIONIST | LAB_TECHNICIAN | PHARMACIST | MANAGER | ADMIN
}
