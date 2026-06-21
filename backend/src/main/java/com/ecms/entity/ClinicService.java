// Mạnh Hùng - HE200743
// Entity ánh xạ bảng "services" trong database.
// Lưu trữ thông tin các dịch vụ khám chữa bệnh của phòng khám: tên dịch vụ, mô tả, giá và thời lượng (phút).
package com.ecms.entity;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "services")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class ClinicService {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "name", nullable = false)
    private String serviceName;

    @Column(name = "description", columnDefinition = "NVARCHAR(500)")
    private String description;

    @Column(name = "price")
    private BigDecimal price;

    @Column(name = "duration_minutes")
    private Integer durationMinutes;

    // ── Thông tin danh mục ──────────────────────────────────────────
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "category_id")
    private ServiceCategory category;

    // ── Thông tin bài viết dịch vụ ─────────────────────────────────
    @Column(unique = true, length = 200)
    private String slug;

    @Column(name = "thumbnail_url", length = 500)
    private String thumbnailUrl;

    /** Nội dung bài viết HTML/rich text */
    @Column(columnDefinition = "NVARCHAR(MAX)")
    private String content;

    /** Nhãn nổi bật, ví dụ: "Phổ biến" */
    @Column(name = "badge", length = 50)
    private String badge;

    /** Nhãn giá, ví dụ: "Giá chỉ từ", "Giá trọn gói" */
    @Column(name = "price_label", length = 100)
    private String priceLabel;

    // ── Quản lý hiển thị ───────────────────────────────────────────
    /** Số buổi khám bao gồm trong gói dịch vụ */
    @Column(name = "sessions_included")
    private Integer sessionsIncluded;

    /** Số ngày hiệu lực kể từ ngày mua */
    @Column(name = "validity_days")
    private Integer validityDays;

    @Column(name = "service_type", nullable = false)
    @Builder.Default
    private String serviceType = "CARE";  // "CLINICAL" hoặc "CARE"

    @Column(name = "is_active")
    private Boolean isActive;

    @Column(name = "display_order")
    private Integer displayOrder;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    private void prePersist() {
        this.createdAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
        if (this.isActive == null) this.isActive = true;
        if (this.displayOrder == null) this.displayOrder = 0;
    }

    @PreUpdate
    private void preUpdate() {
        this.updatedAt = LocalDateTime.now();
    }
}
