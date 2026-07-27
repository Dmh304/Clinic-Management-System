package com.ecms.repository;

import com.ecms.entity.CareSession;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface CareSessionRepository extends JpaRepository<CareSession, Long> {

    List<CareSession> findByPatient_User_EmailOrderByScheduledDateTimeDesc(String email);

    List<CareSession> findByNurse_IdAndStatusOrderByScheduledDateTimeAsc(Long nurseId, String status);

    List<CareSession> findByNurse_IdOrderByScheduledDateTimeAsc(Long nurseId);

    /** Hàng đợi của điều dưỡng theo 1 ngày cụ thể (mọi trạng thái) — dùng cho điều hướng
     *  xem ngày trước/sau trên trang Hàng đợi buổi khám, giống lịch của lễ tân. */
    List<CareSession> findByNurse_IdAndScheduledDateTimeBetweenOrderByScheduledDateTimeAsc(
            Long nurseId, LocalDateTime start, LocalDateTime end);

    List<CareSession> findBySubscription_IdOrderBySessionNumberAsc(Long subscriptionId);

    List<CareSession> findByStatusOrderByScheduledDateTimeAsc(String status);

    @Query("SELECT cs FROM CareSession cs WHERE cs.scheduledDateTime BETWEEN :start AND :end ORDER BY cs.scheduledDateTime ASC")
    List<CareSession> findByScheduledDateBetween(@Param("start") LocalDateTime start, @Param("end") LocalDateTime end);

    List<CareSession> findAllByOrderByScheduledDateTimeDesc();

    @Query("SELECT COUNT(cs) FROM CareSession cs WHERE cs.subscription.id = :subscriptionId AND cs.status != 'CANCELLED'")
    long countActiveSessionsBySubscription(@Param("subscriptionId") Long subscriptionId);

    /** BR-16: số buổi (chưa huỷ) của 1 điều dưỡng trong 1 ngày — dùng kiểm tra sức chứa
     *  khi phân công. excludeId để bỏ qua chính buổi đang phân công (tránh đếm trùng khi đổi ĐD). */
    @Query("""
            SELECT COUNT(cs) FROM CareSession cs
            WHERE cs.nurse.id = :nurseId
              AND cs.id <> :excludeId
              AND cs.scheduledDateTime >= :start
              AND cs.scheduledDateTime < :end
              AND cs.status <> 'CANCELLED'
            """)
    long countByNurseOnDateExcluding(@Param("nurseId") Long nurseId, @Param("excludeId") Long excludeId,
            @Param("start") LocalDateTime start, @Param("end") LocalDateTime end);

    /** UC-54: số buổi chăm sóc một điều dưỡng đã thực hiện xong trong kỳ lương — đầu vào
     *  tính thưởng hiệu suất cho điều dưỡng, tương ứng với "ca đã hoàn thành" của bác sĩ.
     *  Tính cả CHECKED_OUT vì buổi đã thanh toán ra về thì công chăm sóc cũng đã làm xong;
     *  chỉ đếm COMPLETED sẽ ăn bớt công của điều dưỡng ngay khi lễ tân check-out.
     *  nurseUserId là users.id (CareSession.nurse là User), không phải staffs.id. */
    @Query("""
            SELECT COUNT(cs) FROM CareSession cs
            WHERE cs.nurse.id = :nurseUserId
              AND cs.status IN ('COMPLETED', 'CHECKED_OUT')
              AND cs.scheduledDateTime >= :start
              AND cs.scheduledDateTime <= :end
            """)
    long countCompletedByNurseBetween(@Param("nurseUserId") Long nurseUserId,
            @Param("start") LocalDateTime start, @Param("end") LocalDateTime end);

    /** UC-53: tổng số buổi chăm sóc đã thực hiện xong trong kỳ — mẫu số tỉ lệ phản hồi,
     *  vì bệnh nhân cũng đánh giá được buổi dịch vụ chứ không chỉ lịch khám. */
    @Query("""
            SELECT COUNT(cs) FROM CareSession cs
            WHERE cs.status IN ('COMPLETED', 'CHECKED_OUT')
              AND cs.scheduledDateTime >= :start
              AND cs.scheduledDateTime <= :end
            """)
    long countCompletedBetween(@Param("start") LocalDateTime start, @Param("end") LocalDateTime end);

    /** UC-19 ALT-1: các buổi BOOKED chưa có điều dưỡng trong 1 ngày, sắp theo giờ — nguồn cho Auto-Assign. */
    @Query("""
            SELECT cs FROM CareSession cs
            WHERE cs.nurse IS NULL
              AND cs.status = 'BOOKED'
              AND cs.scheduledDateTime >= :start
              AND cs.scheduledDateTime < :end
            ORDER BY cs.scheduledDateTime ASC
            """)
    List<CareSession> findUnassignedBookedOnDate(@Param("start") LocalDateTime start, @Param("end") LocalDateTime end);
}
