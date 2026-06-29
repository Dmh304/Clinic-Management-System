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

        /**
         * "Lịch hẹn của tôi" theo USER: gồm lịch tự đặt (patient gắn tài khoản này)
         * lẫn lịch đặt hộ người thân (booked_by = user này). Dùng cho UC-11.
         */
        @Query("""
                        SELECT DISTINCT a
                        FROM Appointment a
                        LEFT JOIN FETCH a.patient p
                        LEFT JOIN p.user u
                        LEFT JOIN FETCH a.doctor
                        LEFT JOIN FETCH a.clinicService
                        WHERE u.id = :userId OR a.bookedBy = :userId
                        ORDER BY a.appointmentTime DESC
                        """)
        List<Appointment> findMyAppointmentsByUser(@Param("userId") Long userId);

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

        /**
         * UC-15 (BR-13): số thứ tự hàng đợi là duy nhất theo TỪNG BÁC SĨ trong NGÀY
         * làm việc. Query này lọc thêm theo doctorId để mỗi bác sĩ có dải số thứ tự
         * độc lập, tránh 2 bác sĩ cùng ngày tranh/đụng số của nhau.
         */
        @Query("""
                        SELECT COALESCE(MAX(a.queueNumber), 0)
                        FROM Appointment a
                        WHERE a.doctor.id = :doctorId
                          AND a.appointmentTime >= :start
                          AND a.appointmentTime < :end
                          AND a.status IN :statuses
                        """)
        Integer findMaxQueueNumberByDoctorAndDate(
                        @Param("doctorId") Long doctorId,
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

        /**
         * Các giờ khám đã bị chiếm của 1 bác sĩ trong 1 ngày (mọi trạng thái trừ
         * CANCELLED). Dùng để tính khung giờ còn trống cho bệnh nhân đặt lịch —
         * gồm cả lịch PENDING (đặt online chờ xác nhận) để tránh 2 người đặt
         * trùng giờ.
         */
        @Query("""
                        SELECT a.appointmentTime
                        FROM Appointment a
                        WHERE a.doctor.id = :doctorId
                          AND a.appointmentTime >= :start
                          AND a.appointmentTime < :end
                          AND a.status <> 'CANCELLED'
                        """)
        List<LocalDateTime> findBookedTimesByDoctorAndDate(
                        @Param("doctorId") Long doctorId,
                        @Param("start") LocalDateTime start,
                        @Param("end") LocalDateTime end);

        /**
         * Kiểm tra một bác sĩ đã có lịch hẹn còn hiệu lực (khác CANCELLED) đúng vào
         * một thời điểm hay chưa — dùng để chặn đặt trùng khung giờ.
         */
        boolean existsByDoctor_IdAndAppointmentTimeAndStatusNot(
                        Long doctorId, LocalDateTime appointmentTime, AppointmentStatus status);

        /**
         * UC-13: lịch hẹn cần nhắc — đúng trạng thái, nằm trong khoảng thời gian
         * [start, end] và chưa gửi nhắc (reminder_sent = false). Dùng cho cron job
         * nhắc lịch 24h trước giờ khám.
         */
        List<Appointment> findByStatusAndAppointmentTimeBetweenAndReminderSentFalse(
                        AppointmentStatus status,
                        LocalDateTime start,
                        LocalDateTime end);

        /**
         * Các lịch hẹn quá hạn (giờ khám đã trôi qua) nhưng vẫn ở trạng thái chưa
         * hoàn tất — bệnh nhân không đến khám. Dùng cho cron tự động huỷ no-show.
         */
        @Query("""
                        SELECT a
                        FROM Appointment a
                        LEFT JOIN FETCH a.patient
                        WHERE a.appointmentTime < :cutoff
                          AND a.status IN :statuses
                        """)
        List<Appointment> findNoShowAppointments(
                        @Param("cutoff") LocalDateTime cutoff,
                        @Param("statuses") Collection<AppointmentStatus> statuses);
}
