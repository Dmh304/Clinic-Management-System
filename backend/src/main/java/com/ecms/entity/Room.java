// UC-58: Manage Room Catalogue & Service Mapping
// Danh mục phòng vật lý của phòng khám (khám tổng hợp, phẫu thuật, chăm sóc & phục hồi, xét nghiệm).
package com.ecms.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "rooms")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Room {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "name", nullable = false, length = 100)
    private String name;

    /** Loại nhân sự phòng này phục vụ — quyết định ai được phân vào phòng ở UC-59.
     *  DOCTOR | NURSE | LAB */
    @Column(name = "room_type", nullable = false, length = 20)
    private String roomType;

    /** Sức chứa nhân sự cùng lúc trong phòng — phòng Chăm sóc & phục hồi mặc định = 1 (BR-24). */
    @Column(name = "capacity", nullable = false)
    @Builder.Default
    private Integer capacity = 1;

    @Column(name = "is_active", nullable = false)
    @Builder.Default
    private Boolean isActive = true;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    private void prePersist() {
        this.createdAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
        if (this.capacity == null) this.capacity = 1;
        if (this.isActive == null) this.isActive = true;
    }

    @PreUpdate
    private void preUpdate() {
        this.updatedAt = LocalDateTime.now();
    }
}
