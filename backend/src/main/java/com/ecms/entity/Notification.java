package com.ecms.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

/**
 * UC-13: Thông báo hiển thị cho nhân viên theo vai trò (broadcast theo role).
 *
 * Đây là model RIÊNG, tách biệt với AuditLog: notification là tin nhắn hiển thị
 * cho người dùng (chuông thông báo), còn AuditLog dùng để trace lịch sử hành động.
 */
@Entity
@Table(name = "notifications")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Notification {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // Nội dung thông báo hiển thị cho người dùng
    @Column(name = "message", length = 500)
    private String message;

    // Vai trò nhận thông báo, ví dụ "RECEPTIONIST" — broadcast theo role (vd cho toàn bộ lễ tân)
    @Column(name = "target_role")
    private String targetRole;

    // ID user nhận thông báo cụ thể (vd 1 bệnh nhân) — kiểu thông báo Facebook, riêng từng người.
    // Một thông báo dùng target_user_id (riêng 1 người) HOẶC target_role (broadcast theo vai trò).
    @Column(name = "target_user_id")
    private Long targetUserId;

    // ID lịch hẹn liên quan (nếu có) — dùng để mở modal chi tiết khi click thông báo
    @Column(name = "related_appointment_id")
    private Long relatedAppointmentId;

    // Trạng thái đã đọc / chưa đọc
    @Column(name = "is_read")
    private Boolean isRead;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @PrePersist
    void prePersist() {
        if (isRead == null) {
            isRead = false;
        }
        if (createdAt == null) {
            createdAt = LocalDateTime.now();
        }
    }
}
