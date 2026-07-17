// UC-58: mapping giữa 1 phòng và 1 dịch vụ/loại xét nghiệm mà phòng đó phục vụ.
// 1 dịch vụ có thể có nhiều phòng (A/B/C); 1 phòng chỉ phục vụ 1 dịch vụ tại 1 thời điểm.
package com.ecms.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "room_services")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class RoomService {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "room_id", nullable = false)
    private Room room;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "service_id", nullable = false)
    private ClinicService service;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @PrePersist
    private void prePersist() {
        this.createdAt = LocalDateTime.now();
    }
}
