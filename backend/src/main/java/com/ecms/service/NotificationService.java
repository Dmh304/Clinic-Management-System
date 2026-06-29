package com.ecms.service;

import com.ecms.dto.response.NotificationResponse;

import java.util.List;

/**
 * UC-13: Quản lý thông báo (kiểu Facebook) — nhắm riêng từng user hoặc broadcast theo vai trò.
 */
public interface NotificationService {

    /** Tạo 1 thông báo cho toàn bộ Lễ tân (targetRole = "RECEPTIONIST"). */
    void createForReceptionists(String message, Long relatedAppointmentId);

    /** Tạo 1 thông báo nhắm riêng 1 user (vd 1 bệnh nhân). */
    void createForUser(Long userId, String message, Long relatedAppointmentId);

    /** Lấy tất cả thông báo của 1 người (theo user id hoặc vai trò), mới nhất trước. */
    List<NotificationResponse> getForRecipient(Long userId, String role);

    /** Đếm số thông báo chưa đọc của 1 người. */
    long getUnreadCountForRecipient(Long userId, String role);

    /** Đánh dấu 1 thông báo là đã đọc. */
    NotificationResponse markAsRead(Long id);

    /** Đánh dấu đã đọc toàn bộ thông báo của 1 người. */
    void markAllAsReadForRecipient(Long userId, String role);
}
