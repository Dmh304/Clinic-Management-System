// UC-56 - Configure System and Data
// Entity ánh xạ bảng "notification_templates": mẫu nội dung email/SMS/in-app gửi cho user.
// Khác với bảng "notifications" (lưu các bản ghi ĐÃ gửi) — đây là bảng cấu hình mẫu.
// "Xóa" template = set isActive = false (BR-09), không hard delete.
package com.ecms.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "notification_templates")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class NotificationTemplate {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "template_key", nullable = false, unique = true, length = 100)
    private String templateKey;

    @Column(name = "channel", nullable = false, length = 20)
    private String channel; // EMAIL | SMS | IN_APP

    @Column(name = "subject", length = 255)
    private String subject;

    @Column(name = "body", nullable = false, columnDefinition = "NVARCHAR(MAX)")
    private String body;

    @Column(name = "variables_hint", columnDefinition = "NVARCHAR(MAX)")
    private String variablesHint;

    @Column(name = "is_active", nullable = false)
    private boolean active;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "updated_by")
    private User updatedBy;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}
