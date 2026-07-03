// DucTKH
// Entity đại diện cho bảng medicines trong cơ sở dữ liệu.
// Dùng để lưu trữ thông tin về các loại thuốc có thể kê đơn.
package com.ecms.entity;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "medicines")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Medicine {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, columnDefinition = "nvarchar(255)")
    private String name;

    @Column(name = "dosage_form", columnDefinition = "nvarchar(50)")
    private String dosageForm;

    @Column(nullable = false, columnDefinition = "nvarchar(100)")
    private String unit;

    @Column(name = "unit_price", precision = 10, scale = 2)
    private BigDecimal unitPrice;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    // Thiết lập thời gian tự động khi lần đầu lưu mới vào DB
    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
    }

    // Tự động cập nhật thời gian mỗi khi entity bị sửa đổi
    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
