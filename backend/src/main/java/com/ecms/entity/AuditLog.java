// UC-57 - Manage System Audit Log
// Entity ánh xạ bảng "audit_logs": ghi lại mọi thay đổi quan trọng trong hệ thống dưới dạng
// append-only (chỉ INSERT/SELECT, không UPDATE/DELETE — xem migration revoke_audit_log_write.sql).
package com.ecms.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "audit_logs")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class AuditLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id")
    private User user;

    @Column(name = "action", nullable = false, length = 100)
    private String action;

    @Column(name = "entity_type", length = 100)
    private String entityType;

    @Column(name = "entity_id", length = 100)
    private String entityId;

    // Lưu dạng JSON string (snapshot trước khi thay đổi)
    @Column(name = "old_value", columnDefinition = "NVARCHAR(MAX)")
    private String oldValue;

    // Lưu dạng JSON string (snapshot sau khi thay đổi)
    @Column(name = "new_value", columnDefinition = "NVARCHAR(MAX)")
    private String newValue;

    @Column(name = "ip_address", length = 64)
    private String ipAddress;

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    private void prePersist() {
        if (createdAt == null) createdAt = LocalDateTime.now();
    }
}
