package com.ecms.service;

import com.ecms.dto.response.NotificationResponse;

import java.util.List;

/**
 * UC-13: Quản lý thông báo (kiểu Facebook) — nhắm riêng từng user hoặc
 * broadcast theo vai trò.
 */
public interface NotificationService {

    /**
     * Tạo 1 thông báo cho toàn bộ Lễ tân (targetRole = "RECEPTIONIST"). Mặc định
     * entityType
     * "APPOINTMENT" (giữ tương thích các call site cũ — relatedId thực sự là
     * appointmentId).
     */
    void createForReceptionists(String message, Long relatedAppointmentId);

    /**
     * Như trên nhưng entityId có thể thuộc bất kỳ loại thực thể nào (vd
     * "CARE_SESSION",
     * "PROMOTION") — dùng để chuông thông báo điều hướng đúng trang khi click.
     */
    void createForReceptionists(String message, Long relatedEntityId, String relatedEntityType);

    /**
     * Tạo 1 thông báo cho toàn bộ Kỹ thuật viên (targetRole = "LAB_TECHNICIAN").
     */
    void createForLabTechnicians(String message, Long relatedAppointmentId);

    /**
     * Tạo 1 thông báo cho toàn bộ người dùng thuộc 1 vai trò bất kỳ (vd "MANAGER").
     */
    void createForRole(String role, String message, Long relatedAppointmentId);

    void createForRole(String role, String message, Long relatedEntityId, String relatedEntityType);

    /**
     * Tạo 1 thông báo cho toàn bộ Quản lý phòng khám (targetRole = "MANAGER").
     * UC-48.
     */
    void createForManagers(String message, Long relatedAppointmentId);

    void createForManagers(String message, Long relatedEntityId, String relatedEntityType);

    /** Tạo 1 thông báo nhắm riêng 1 user (vd 1 bệnh nhân). */
    void createForUser(Long userId, String message, Long relatedAppointmentId);

    void createForUser(Long userId, String message, Long relatedEntityId, String relatedEntityType);

    /**
     * Lấy tất cả thông báo của 1 người (theo user id hoặc vai trò), mới nhất trước.
     */
    List<NotificationResponse> getForRecipient(Long userId, String role);

    /** Đếm số thông báo chưa đọc của 1 người. */
    long getUnreadCountForRecipient(Long userId, String role);

    /** Đánh dấu 1 thông báo là đã đọc. */
    NotificationResponse markAsRead(Long id);

    /** Đánh dấu đã đọc toàn bộ thông báo của 1 người. */
    void markAllAsReadForRecipient(Long userId, String role);
}
