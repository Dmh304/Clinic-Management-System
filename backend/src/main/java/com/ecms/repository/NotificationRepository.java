package com.ecms.repository;

import com.ecms.entity.Notification;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * UC-13: Truy cập dữ liệu bảng notifications.
 *
 * Thông báo của 1 người = thông báo nhắm riêng họ (target_user_id) HOẶC broadcast
 * theo vai trò của họ (target_role). Các truy vấn dưới đây gộp cả hai nguồn.
 */
@Repository
public interface NotificationRepository extends JpaRepository<Notification, Long> {

    // Tất cả thông báo của 1 người (theo user id hoặc theo vai trò), mới nhất trước
    @Query("""
            SELECT n FROM Notification n
            WHERE n.targetUserId = :userId OR n.targetRole = :role
            ORDER BY n.createdAt DESC
            """)
    List<Notification> findForRecipient(@Param("userId") Long userId, @Param("role") String role);

    // Đếm thông báo chưa đọc của 1 người
    @Query("""
            SELECT COUNT(n) FROM Notification n
            WHERE (n.targetUserId = :userId OR n.targetRole = :role) AND n.isRead = false
            """)
    long countUnreadForRecipient(@Param("userId") Long userId, @Param("role") String role);

    // Đánh dấu đã đọc toàn bộ thông báo chưa đọc của 1 người
    @Modifying
    @Query("""
            UPDATE Notification n SET n.isRead = true
            WHERE (n.targetUserId = :userId OR n.targetRole = :role) AND n.isRead = false
            """)
    int markAllAsReadForRecipient(@Param("userId") Long userId, @Param("role") String role);
}
