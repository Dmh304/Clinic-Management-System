/**
 * Entity ánh xạ bảng "rooms" — catalogue phòng vật lý của phòng khám.
 *
 * Hỗ trợ UC-55 (Manage Room Catalogue & Service Mapping).
 *
 * Mỗi phòng thuộc 1 category (RoomCategory) và có capacity cố định = 1
 * (1 staff + 1 patient tại một thời điểm), đúng theo mô hình phòng khám
 * 1 địa điểm quy mô nhỏ.
 *
 * `clinicService` là OPTIONAL: chỉ gán khi phòng phục vụ đúng 1 dịch vụ cụ
 * thể (vd. phòng khám tổng hợp <-> "Khám tổng quát mắt"). Với phòng phục vụ
 * nhiều dịch vụ cùng category (vd. phòng Care & Recovery phục vụ mọi gói
 * CARE, phòng chẩn đoán hình ảnh phục vụ mọi lab-service), để trống và dựa
 * vào `category` để nhóm — tránh phải tạo 1 phòng riêng cho từng dịch vụ khi
 * nhân sự không đủ (xem ghi chú trao đổi với Tridintism ngày 19/07/2026).
 */
package com.ecms.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.NotFound;
import org.hibernate.annotations.NotFoundAction;

import java.time.LocalDateTime;

@Entity
@Table(name = "rooms")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Room {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "name", nullable = false, length = 100)
    private String name;

    @Enumerated(EnumType.STRING)
    @Column(name = "category", nullable = false, length = 30)
    private RoomCategory category;

    /**
     * Dịch vụ cụ thể mà phòng này phục vụ — optional (xem javadoc lớp).
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @NotFound(action = NotFoundAction.IGNORE)
    @JoinColumn(name = "service_id")
    private ClinicService clinicService;

    /**
     * Sức chứa đồng thời — mặc định 1 (1 staff/1 bệnh nhân) cho Clinical Exam
     * và Care & Recovery, theo mô hình phòng khám 1 địa điểm.
     */
    @Column(name = "capacity", nullable = false)
    @Builder.Default
    private Integer capacity = 1;

    @Column(name = "status", nullable = false, length = 20)
    @Builder.Default
    private String status = "ACTIVE";

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    private void prePersist() {
        if (createdAt == null)
            createdAt = LocalDateTime.now();
        if (status == null)
            status = "ACTIVE";
        if (capacity == null)
            capacity = 1;
    }

    @PreUpdate
    private void preUpdate() {
        updatedAt = LocalDateTime.now();
    }
}