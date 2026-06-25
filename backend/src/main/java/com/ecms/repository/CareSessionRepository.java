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

    List<CareSession> findBySubscription_IdOrderBySessionNumberAsc(Long subscriptionId);

    List<CareSession> findByStatusOrderByScheduledDateTimeAsc(String status);

    @Query("SELECT cs FROM CareSession cs WHERE cs.scheduledDateTime BETWEEN :start AND :end ORDER BY cs.scheduledDateTime ASC")
    List<CareSession> findByScheduledDateBetween(@Param("start") LocalDateTime start, @Param("end") LocalDateTime end);

    List<CareSession> findAllByOrderByScheduledDateTimeDesc();

    @Query("SELECT COUNT(cs) FROM CareSession cs WHERE cs.subscription.id = :subscriptionId AND cs.status != 'CANCELLED'")
    long countActiveSessionsBySubscription(@Param("subscriptionId") Long subscriptionId);
}
