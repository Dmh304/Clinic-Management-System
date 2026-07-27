package com.ecms.repository;

import com.ecms.entity.FeedbackParticipantRating;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;

/**
 * @author  ThangNB - HE201024
 * @created 2026-07-27
 *
 * UC-53: điểm đánh giá theo từng người tham gia (bác sĩ, điều dưỡng, lễ tân, KTV
 * xét nghiệm) — nguồn cho phần báo cáo hài lòng ngoài bác sĩ.
 */
public interface FeedbackParticipantRatingRepository extends JpaRepository<FeedbackParticipantRating, Long> {

    /**
     * Lấy toàn bộ điểm theo người tham gia của các feedback gửi trong kỳ.
     *
     * Lọc theo thời điểm gửi feedback (feedback.createdAt) để khớp đúng kỳ với
     * {@code feedbackRepository.findByCreatedAtBetween}, nếu không tổng số phản hồi
     * và phần theo vai trò sẽ nói về hai tập dữ liệu khác nhau.
     *
     * @param start đầu kỳ, tính cả
     * @param end   cuối kỳ, tính cả
     * @return các dòng điểm participant trong kỳ
     */
    @Query("""
            SELECT r FROM FeedbackParticipantRating r
            WHERE r.feedback.createdAt >= :start
              AND r.feedback.createdAt <= :end
            """)
    List<FeedbackParticipantRating> findByFeedbackCreatedAtBetween(@Param("start") LocalDateTime start,
            @Param("end") LocalDateTime end);
}
