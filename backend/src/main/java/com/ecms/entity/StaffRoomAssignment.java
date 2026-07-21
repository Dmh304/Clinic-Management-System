/**
 * Entity ánh xạ bảng "staff_room_assignments" — phân trực phòng cho nhân sự
 * theo ngày (UC-56 Manage Staff Room Roster).
 *
 * Mô hình "standing assignment + one-day override":
 *   - Assignment thường (isOneDayOverride = false, workDate = null):
 *     có hiệu lực từ `effectiveFrom` trở đi cho tới khi bị thay thế bởi
 *     assignment mới hơn — đúng nghiệp vụ "cố định trừ khi manager đổi".
 *   - Assignment override (isOneDayOverride = true, workDate = ngày cụ thể):
 *     chỉ áp dụng đúng ngày đó, không ảnh hưởng tới standing assignment
 *     (ALT-1 trong UC-56).
 *
 * Việc resolve phòng cho 1 nhân sự vào 1 ngày cụ thể luôn ưu tiên override
 * đúng ngày đó trước, nếu không có mới lấy standing assignment gần nhất
 * (effectiveFrom <= ngày cần resolve).
 *
 * staff_id là polymorphic theo staffType (xem StaffType.java) — validate ở
 * tầng Service, KHÔNG có FK constraint DB cho cột này.
 */
package com.ecms.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.NotFound;
import org.hibernate.annotations.NotFoundAction;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "staff_room_assignments")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class StaffRoomAssignment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Enumerated(EnumType.STRING)
    @Column(name = "staff_type", nullable = false, length = 20)
    private StaffType staffType;

    /**
     * Polymorphic FK — trỏ tới doctors.id / staffs.id / lab_technicians.id
     * tuỳ staffType. Validate ở Service layer.
     */
    @Column(name = "staff_id", nullable = false)
    private Long staffId;

    @ManyToOne(fetch = FetchType.LAZY)
    @NotFound(action = NotFoundAction.IGNORE)
    @JoinColumn(name = "room_id", nullable = false)
    private Room room;

    /**
     * Ngày assignment này bắt đầu có hiệu lực (dùng cho standing assignment).
     */
    @Column(name = "effective_from", nullable = false)
    private LocalDate effectiveFrom;

    /**
     * Chỉ set khi đây là override 1 ngày (ALT-1). Null với standing assignment.
     */
    @Column(name = "work_date")
    private LocalDate workDate;

    @Column(name = "is_one_day_override", nullable = false)
    @Builder.Default
    private Boolean isOneDayOverride = false;

    /**
     * ID của Clinic Manager thực hiện phân trực (users.id), phục vụ Audit Log.
     */
    @Column(name = "assigned_by")
    private Long assignedBy;

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    private void prePersist() {
        if (createdAt == null)
            createdAt = LocalDateTime.now();
        if (isOneDayOverride == null)
            isOneDayOverride = false;
        if (effectiveFrom == null)
            effectiveFrom = LocalDate.now();
    }
}