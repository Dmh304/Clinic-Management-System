
/**
 * Kho lưu trữ dữ liệu Lịch hẹn (Appointment Repository)
 * Cung cấp các câu lệnh truy vấn phục vụ cho việc điều phối hàng đợi bệnh nhân,
 * thống kê dashboard phòng khám và tối ưu hóa hiệu năng dữ liệu liên kết thông qua Fetch Join
 */

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

        /**
         * Lấy tất cả các lịch hẹn trong hệ thống kèm theo thông tin chi tiết.
         * Sử dụng `LEFT JOIN FETCH` để nạp sẵn dữ liệu liên kết (Patient, Doctor,
         * ClinicService)
         * trong một câu truy vấn duy nhất, ngăn ngừa lỗi N+1 Query
         */
        @Query("""
                        SELECT DISTINCT a
                        FROM Appointment a
                        LEFT JOIN FETCH a.patient
                        LEFT JOIN FETCH a.doctor
                        LEFT JOIN FETCH a.clinicService
                        ORDER BY a.appointmentTime DESC
                        """)
        List<Appointment> findAllWithDetails();

        /**
         * Lấy danh sách toàn bộ lịch hẹn của một bệnh nhân cụ thể dựa vào Patient ID
         * Đi kèm cơ chế FETCH JOIN để hiển thị đầy đủ thông tin bác sĩ và dịch vụ trên
         * giao diện lịch sử cá nhân
         */
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
         * Lấy danh sách lịch hẹn nằm trong một khoảng thời gian cụ thể (từ start đến
         * end)
         * Kết quả sắp xếp tăng dần theo khung giờ khám (timeSlot ASC)
         */
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

        /**
         * Tìm kiếm lịch hẹn trong khoảng thời gian xác định và lọc theo một trạng thái
         * duy nhất
         * Phù hợp để liệt kê nhanh danh sách theo luồng nghiệp vụ
         */
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

        /**
         * Đếm tổng số lịch hẹn của một bác sĩ cụ thể nằm trong tập hợp các trạng thái
         * truyền vào
         * Thường dùng để kiểm tra giới hạn năng suất (capacity) khám tối đa 30 ca một
         * ngày của bác sĩ
         */
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

        /**
         * Tìm kiếm lịch hẹn thông minh qua từ khóa (Keyword)
         * Hỗ trợ tìm kiếm không phân biệt hoa thường (LOWER) dựa trên: Tên bệnh nhân,
         * Số điện thoại hoặc Mã bệnh nhân
         */
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

        /**
         * Lấy danh sách hàng đợi (Queue) bệnh nhân trong ngày theo một trạng thái chỉ
         * định
         * Điểm đặc biệt: Ưu tiên xếp theo thời gian check-in trước (checkInTime ASC),
         * nếu bằng nhau sẽ tính theo thời gian tạo (createdAt ASC)
         */
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

        /**
         * Thống kê: Đếm tổng số lịch hẹn trong một khoảng thời gian (phục vụ dashboard
         * tổng quan)
         */
        @Query("""
                        SELECT COUNT(a)
                        FROM Appointment a
                        WHERE a.appointmentTime >= :start
                          AND a.appointmentTime < :end
                        """)
        long countByDate(
                        @Param("start") LocalDateTime start,
                        @Param("end") LocalDateTime end);

        /**
         * Thống kê: Đếm số lượng lịch hẹn theo từng trạng thái cụ thể trong ngày
         */
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

        /**
         * Lấy số thứ tự (Queue Number) lớn nhất hiện tại trong ngày của các trạng thái
         * được chỉ định
         * Sử dụng `COALESCE(..., 0)` để nếu đầu ngày chưa có ai xếp hàng (kết quả MAX
         * trả về NULL), hệ thống sẽ tự động gán về 0
         */
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
         * Lấy lịch trình làm việc chi tiết trong ngày của RIÊNG một bác sĩ
         * Chỉ lọc ra các lịch hẹn hợp lệ liên quan đến quá trình tiếp nhận và khám chữa
         * bệnh thực tế
         */
        @Query("SELECT a FROM Appointment a " +
                        "WHERE a.appointmentTime >= :start AND a.appointmentTime < :end " +
                        "AND a.doctor.id = :doctorId " +
                        "AND a.status IN ('WAITING', 'IN_PROGRESS', 'COMPLETED', 'CONFIRMED', 'CANCELLED') " +
                        "ORDER BY a.appointmentTime ASC")
        List<Appointment> findByAppointmentDateAndDoctorIdOrderByAppointmentTimeAsc(
                        @Param("start") LocalDateTime start,
                        @Param("end") LocalDateTime end,
                        @Param("doctorId") Long doctorId);

        /**
         * Thống kê: Đếm tổng số lịch hẹn của một bác sĩ cụ thể trong ngày
         */
        @Query("SELECT COUNT(a) FROM Appointment a " +
                        "WHERE a.appointmentTime >= :start AND a.appointmentTime < :end " +
                        "AND a.doctor.id = :doctorId")
        long countByDateAndDoctorId(
                        @Param("start") LocalDateTime start,
                        @Param("end") LocalDateTime end,
                        @Param("doctorId") Long doctorId);

        /**
         * Thống kê chuyên sâu: Đếm số lượng lịch hẹn của một bác sĩ được phân loại chi
         * tiết theo trạng thái
         */
        @Query("SELECT COUNT(a) FROM Appointment a " +
                        "WHERE a.appointmentTime >= :start AND a.appointmentTime < :end " +
                        "AND a.status = :status AND a.doctor.id = :doctorId")
        long countByDateAndStatusAndDoctorId(
                        @Param("start") LocalDateTime start,
                        @Param("end") LocalDateTime end,
                        @Param("status") AppointmentStatus status,
                        @Param("doctorId") Long doctorId);

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
