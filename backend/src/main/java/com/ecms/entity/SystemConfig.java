// UC-56 - Configure System and Data
// Entity ánh xạ bảng "system_configs": lưu các cấu hình hệ thống dạng key-value
// (clinic info, ngưỡng nghiệp vụ...). data_type quyết định cách parse/validate config_value.
package com.ecms.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "system_configs")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class SystemConfig {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "config_key", nullable = false, unique = true, length = 100)
    private String configKey;

    @Column(name = "config_value", nullable = false, columnDefinition = "NVARCHAR(MAX)")
    private String configValue;

    @Column(name = "data_type", nullable = false, length = 20)
    private String dataType; // STRING | INTEGER | BIT | JSON

    @Column(name = "description", columnDefinition = "NVARCHAR(MAX)")
    private String description;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "updated_by")
    private User updatedBy;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}
