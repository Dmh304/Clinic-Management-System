package com.ecms.repository;

import com.ecms.entity.Feedback;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDateTime;
import java.util.List;

/**
 * UC-48 / UC-53: Truy vấn đánh giá của bệnh nhân.
 */
public interface FeedbackRepository extends JpaRepository<Feedback, Long> {

    // BR-21: mỗi lịch hẹn chỉ được gửi 1 feedback
    boolean existsByAppointment_Id(Long appointmentId);

    // Mỗi buổi dịch vụ (điều dưỡng đảm nhiệm) cũng chỉ được gửi 1 feedback
    boolean existsByCareSession_Id(Long careSessionId);

    // Feedback của một bệnh nhân, mới nhất trước
    List<Feedback> findByPatient_IdOrderByCreatedAtDesc(Long patientId);

    // UC-53: lấy toàn bộ feedback trong khoảng thời gian để tổng hợp báo cáo
    List<Feedback> findByCreatedAtBetween(LocalDateTime from, LocalDateTime to);
}
