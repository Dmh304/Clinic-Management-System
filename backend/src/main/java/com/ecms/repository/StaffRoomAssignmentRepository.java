package com.ecms.repository;

import com.ecms.entity.StaffRoomAssignment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Repository
public interface StaffRoomAssignmentRepository extends JpaRepository<StaffRoomAssignment, Long> {

    /** UC-59 ALT-1: bản ghi đổi phòng chỉ áp dụng đúng ngày này (nếu có). */
    Optional<StaffRoomAssignment> findByStaffUser_IdAndIsOverrideTrueAndOverrideDate(Long staffUserId, LocalDate date);

    /** UC-59: bản ghi standing đã có sẵn cho đúng ngày effectiveFrom này (nếu có) — dùng để cập nhật
     *  thay vì tạo trùng khi Manager gán lại cùng 1 ngày bắt đầu. */
    Optional<StaffRoomAssignment> findByStaffUser_IdAndIsOverrideFalseAndEffectiveFrom(Long staffUserId, LocalDate effectiveFrom);

    /** UC-58 ALT-1: mọi phân công (standing + override) đang trỏ tới 1 phòng — dùng khi phòng bị
     *  vô hiệu hoá để Manager xem và xử lý. */
    List<StaffRoomAssignment> findByRoom_IdOrderByCreatedAtDesc(Long roomId);

    /** UC-59: phân công standing gần nhất có hiệu lực tính đến ngày cần tra — dùng khi
     *  không có override cho ngày đó (phân công "cố định trừ khi có thay đổi"). */
    @Query("""
            SELECT sra FROM StaffRoomAssignment sra
            WHERE sra.staffUser.id = :staffUserId
              AND sra.isOverride = false
              AND sra.effectiveFrom <= :date
            ORDER BY sra.effectiveFrom DESC
            """)
    List<StaffRoomAssignment> findStandingAssignmentsUpToDate(@Param("staffUserId") Long staffUserId,
            @Param("date") LocalDate date);

    /** UC-59 E-2: ai đang chiếm phòng này vào 1 ngày cụ thể (standing + override), để kiểm tra sức chứa. */
    @Query("""
            SELECT sra FROM StaffRoomAssignment sra
            WHERE sra.room.id = :roomId
              AND ((sra.isOverride = true AND sra.overrideDate = :date)
                OR (sra.isOverride = false AND sra.effectiveFrom <= :date))
            """)
    List<StaffRoomAssignment> findByRoomOnDate(@Param("roomId") Long roomId, @Param("date") LocalDate date);
}
