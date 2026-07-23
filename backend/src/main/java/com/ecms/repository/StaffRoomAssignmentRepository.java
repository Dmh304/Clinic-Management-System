package com.ecms.repository;

import com.ecms.entity.StaffRoomAssignment;
import com.ecms.entity.StaffType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface StaffRoomAssignmentRepository extends JpaRepository<StaffRoomAssignment, Long> {

    /**
     * Override đúng ngày cần resolve (ALT-1 UC-56), nếu có sẽ ưu tiên áp dụng.
     */
    Optional<StaffRoomAssignment> findByStaffTypeAndStaffIdAndWorkDateAndIsOneDayOverrideTrue(
            StaffType staffType, Long staffId, LocalDate workDate);

    /**
     * Standing assignment gần nhất có hiệu lực tại ngày cần resolve
     * (effectiveFrom <= date), lấy bản mới nhất.
     */
    @Query("""
            SELECT sra FROM StaffRoomAssignment sra
            WHERE sra.staffType = :staffType
              AND sra.staffId = :staffId
              AND sra.isOneDayOverride = false
              AND sra.effectiveFrom <= :date
            ORDER BY sra.effectiveFrom DESC, sra.id DESC
            """)
    List<StaffRoomAssignment> findStandingAssignments(
            @Param("staffType") StaffType staffType,
            @Param("staffId") Long staffId,
            @Param("date") LocalDate date);

    /**
     * Toàn bộ nhân sự (mọi loại) đang được phân trực phòng vào 1 ngày cụ thể —
     * dùng để hiển thị màn hình 'Room Roster' (bước 2 Normal Flow UC-56).
     * Ưu tiên override đúng ngày, fallback standing mới nhất — xử lý gộp ở
     * tầng Service vì JPQL khó diễn đạt "mới nhất mỗi nhóm" gọn gàng.
     */
    List<StaffRoomAssignment> findByEffectiveFromLessThanEqualAndIsOneDayOverrideFalseOrderByStaffTypeAscStaffIdAscEffectiveFromDesc(
            LocalDate date);

    List<StaffRoomAssignment> findByWorkDateAndIsOneDayOverrideTrue(LocalDate date);

    // UC-55 ALT-1: mọi phân công (standing + override) đang trỏ tới 1 phòng — dùng khi
    // phòng bị vô hiệu hoá để Manager xem ai đang trực và xử lý.
    List<StaffRoomAssignment> findByRoomIdOrderByCreatedAtDesc(Long roomId);

    // Kiểm tra phòng đã có ai trực trùng ngày (capacity=1) — dùng cho ALT-2 warning
    List<StaffRoomAssignment> findByRoomIdAndEffectiveFromLessThanEqualAndIsOneDayOverrideFalse(
            Long roomId, LocalDate date);

    List<StaffRoomAssignment> findByRoomIdAndWorkDateAndIsOneDayOverrideTrue(Long roomId, LocalDate date);
}