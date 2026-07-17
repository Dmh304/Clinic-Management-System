// UC-59: Manage Staff Room Roster
// Phân công 1 nhân sự (bác sĩ/điều dưỡng/lab) vào 1 phòng.
// Bản ghi "standing" (isOverride = false) có hiệu lực từ effectiveFrom trở đi cho tới khi có
// bản ghi standing mới hơn — tra cứu phòng hiện tại của 1 nhân sự = bản ghi standing gần nhất
// có effectiveFrom <= ngày cần tra, trừ khi có bản ghi override đúng ngày đó (ALT-1, chỉ áp
// dụng 1 ngày rồi quay lại phân công standing).
package com.ecms.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "staff_room_assignments")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class StaffRoomAssignment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** Bác sĩ/điều dưỡng/lab được phân công — dùng users.id giống care_sessions.nurse_id. */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "staff_user_id", nullable = false)
    private User staffUser;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "room_id", nullable = false)
    private Room room;

    /** Ngày bắt đầu có hiệu lực của phân công standing (bỏ qua nếu isOverride = true). */
    @Column(name = "effective_from")
    private LocalDate effectiveFrom;

    /** ALT-1: đổi phòng chỉ trong 1 ngày, hôm sau quay lại phân công standing trước đó. */
    @Column(name = "is_override", nullable = false)
    @Builder.Default
    private Boolean isOverride = false;

    @Column(name = "override_date")
    private LocalDate overrideDate;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "assigned_by", nullable = false)
    private User assignedBy;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    private void prePersist() {
        this.createdAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
        if (this.isOverride == null) this.isOverride = false;
    }

    @PreUpdate
    private void preUpdate() {
        this.updatedAt = LocalDateTime.now();
    }
}
