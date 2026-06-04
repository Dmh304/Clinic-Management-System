// Mạnh Hùng - HE200743
// Entity ánh xạ bảng "services" trong database.
// Lưu trữ thông tin các dịch vụ khám chữa bệnh của phòng khám: tên dịch vụ, mô tả, giá và thời lượng (phút).
package com.ecms.entity;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;

@Entity
@Table(name = "services")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class ClinicService {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "name", nullable = false)
    private String serviceName;

    @Column(name = "description")
    private String description;

    @Column(name = "price")
    private BigDecimal price;

    @Column(name = "duration_minutes")
    private Integer durationMinutes;
}
