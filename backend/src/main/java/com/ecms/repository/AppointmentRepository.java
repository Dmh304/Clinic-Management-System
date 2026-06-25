package com.ecms.repository;

import com.ecms.entity.Appointment;
import com.ecms.entity.AppointmentStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;

public interface AppointmentRepository extends JpaRepository<Appointment, Long> {

        @Query("""
                        SELECT DISTINCT a
                        FROM Appointment a
                        LEFT JOIN FETCH a.patient
                        LEFT JOIN FETCH a.doctor
                        LEFT JOIN FETCH a.clinicService
                        ORDER BY a.appointmentTime DESC
                        """)
        List<Appointment> findAllWithDetails();

        @Query("""
                        SELECT DISTINCT a
                        FROM Appointment a
                        LEFT JOIN FETCH a.patient
                        LEFT JOIN FETCH a.doctor
                        LEFT JOIN FETCH a.clinicService
                        WHERE a.patient.id = :patientId
                        ORDER BY a.appointmentTime DESC
                        """)
        List<Appointment> findAllWithDetailsAndPatientId(@Param("patientId") Long patientId);

        @Query("""
                        SELECT DISTINCT a
                        FROM Appointment a
                        LEFT JOIN FETCH a.patient
                        LEFT JOIN FETCH a.doctor
                        LEFT JOIN FETCH a.clinicService
                        WHERE a.appointmentTime >= :start
                          AND a.appointmentTime < :end
                        ORDER BY a.timeSlot ASC
                        """)
        List<Appointment> findByAppointmentDateOrderByTimeSlotAsc(
                        @Param("start") LocalDateTime start,
                        @Param("end") LocalDateTime end);

        @Query("""
                        SELECT DISTINCT a
                        FROM Appointment a
                        LEFT JOIN FETCH a.patient
                        LEFT JOIN FETCH a.doctor
                        LEFT JOIN FETCH a.clinicService
                        WHERE a.appointmentTime >= :start
                          AND a.appointmentTime < :end
                          AND a.status = :status
                        ORDER BY a.timeSlot ASC
                        """)
        List<Appointment> findByAppointmentDateAndStatusOrderByTimeSlotAsc(
                        @Param("start") LocalDateTime start,
                        @Param("end") LocalDateTime end,
                        @Param("status") AppointmentStatus status);

        @Query("""
                        SELECT COUNT(a)
                        FROM Appointment a
                        WHERE a.doctor.id = :doctorId
                          AND a.appointmentTime >= :start
                          AND a.appointmentTime < :end
                          AND a.status IN :statuses
                        """)
        long countByDoctorIdAndAppointmentDateAndStatusIn(
                        @Param("doctorId") Long doctorId,
                        @Param("start") LocalDateTime start,
                        @Param("end") LocalDateTime end,
                        @Param("statuses") Collection<AppointmentStatus> statuses);

        @Query("""
                        SELECT DISTINCT a
                        FROM Appointment a
                        LEFT JOIN FETCH a.patient
                        LEFT JOIN FETCH a.doctor
                        LEFT JOIN FETCH a.clinicService
                        WHERE LOWER(a.patient.fullName) LIKE LOWER(CONCAT('%', :keyword, '%'))
                           OR a.patient.phone LIKE CONCAT('%', :keyword, '%')
                           OR CAST(a.patient.id AS string) LIKE CONCAT('%', :keyword, '%')
                        ORDER BY a.appointmentTime DESC, a.timeSlot ASC
                        """)
        List<Appointment> searchAppointments(@Param("keyword") String keyword);

        @Query("""
                        SELECT DISTINCT a
                        FROM Appointment a
                        LEFT JOIN FETCH a.patient
                        LEFT JOIN FETCH a.doctor
                        LEFT JOIN FETCH a.clinicService
                        WHERE a.appointmentTime >= :start
                          AND a.appointmentTime < :end
                          AND a.status = :status
                        ORDER BY a.checkInTime ASC, a.createdAt ASC
                        """)
        List<Appointment> findByAppointmentDateAndStatusOrderByCreatedAtAsc(
                        @Param("start") LocalDateTime start,
                        @Param("end") LocalDateTime end,
                        @Param("status") AppointmentStatus status);

        @Query("""
                        SELECT COUNT(a)
                        FROM Appointment a
                        WHERE a.appointmentTime >= :start
                          AND a.appointmentTime < :end
                        """)
        long countByDate(
                        @Param("start") LocalDateTime start,
                        @Param("end") LocalDateTime end);

        @Query("""
                        SELECT COUNT(a)
                        FROM Appointment a
                        WHERE a.appointmentTime >= :start
                          AND a.appointmentTime < :end
                          AND a.status = :status
                        """)
        long countByDateAndStatus(
                        @Param("start") LocalDateTime start,
                        @Param("end") LocalDateTime end,
                        @Param("status") AppointmentStatus status);

        @Query("""
                        SELECT COALESCE(MAX(a.queueNumber), 0)
                        FROM Appointment a
                        WHERE a.appointmentTime >= :start
                          AND a.appointmentTime < :end
                          AND a.status IN :statuses
                        """)
        Integer findMaxQueueNumberByDate(
                        @Param("start") LocalDateTime start,
                        @Param("end") LocalDateTime end,
                        @Param("statuses") Collection<AppointmentStatus> statuses);

        @Query("SELECT a FROM Appointment a " +
                        "WHERE a.appointmentTime >= :start AND a.appointmentTime < :end " +
                        "AND a.doctor.id = :doctorId " +
                        "AND a.status IN ('WAITING', 'IN_PROGRESS', 'COMPLETED', 'CONFIRMED') " +
                        "ORDER BY a.appointmentTime ASC")
        List<Appointment> findByAppointmentDateAndDoctorIdOrderByAppointmentTimeAsc(
                        @Param("start") LocalDateTime start,
                        @Param("end") LocalDateTime end,
                        @Param("doctorId") Long doctorId);

        @Query("SELECT COUNT(a) FROM Appointment a " +
                        "WHERE a.appointmentTime >= :start AND a.appointmentTime < :end " +
                        "AND a.doctor.id = :doctorId")
        long countByDateAndDoctorId(
                        @Param("start") LocalDateTime start,
                        @Param("end") LocalDateTime end,
                        @Param("doctorId") Long doctorId);

        @Query("SELECT COUNT(a) FROM Appointment a " +
                        "WHERE a.appointmentTime >= :start AND a.appointmentTime < :end " +
                        "AND a.status = :status AND a.doctor.id = :doctorId")
        long countByDateAndStatusAndDoctorId(
                        @Param("start") LocalDateTime start,
                        @Param("end") LocalDateTime end,
                        @Param("status") AppointmentStatus status,
                        @Param("doctorId") Long doctorId);
}
