package com.ecms.service.impl;

import com.ecms.dto.response.NotificationResponse;
import com.ecms.entity.Notification;
import com.ecms.exception.ResourceNotFoundException;
import com.ecms.repository.NotificationRepository;
import com.ecms.service.NotificationService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

/**
 * UC-13: Triển khai quản lý thông báo (kiểu Facebook) — nhắm riêng user hoặc
 * broadcast theo vai trò.
 */
@Service
@RequiredArgsConstructor
public class NotificationServiceImpl implements NotificationService {

    private static final String ROLE_RECEPTIONIST = "RECEPTIONIST";

    private final NotificationRepository notificationRepository;

    @Override
    @Transactional
    public void createForReceptionists(String message, Long relatedAppointmentId) {
        notificationRepository.save(Notification.builder()
                .message(message)
                .targetRole(ROLE_RECEPTIONIST)
                .relatedAppointmentId(relatedAppointmentId)
                .isRead(false)
                .build());
    }

    @Override
    @Transactional
    public void createForUser(Long userId, String message, Long relatedAppointmentId) {
        if (userId == null) {
            return; // bệnh nhân vãng lai không có tài khoản -> bỏ qua, không tạo thông báo
        }
        notificationRepository.save(Notification.builder()
                .message(message)
                .targetUserId(userId)
                .relatedAppointmentId(relatedAppointmentId)
                .isRead(false)
                .build());
    }

    @Override
    @Transactional(readOnly = true)
    public List<NotificationResponse> getForRecipient(Long userId, String role) {
        return notificationRepository.findForRecipient(userId, role)
                .stream()
                .map(NotificationResponse::from)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public long getUnreadCountForRecipient(Long userId, String role) {
        return notificationRepository.countUnreadForRecipient(userId, role);
    }

    @Override
    @Transactional
    public NotificationResponse markAsRead(Long id) {
        Notification notification = notificationRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Thông báo không tồn tại: " + id));
        notification.setIsRead(true);
        return NotificationResponse.from(notificationRepository.save(notification));
    }

    @Override
    @Transactional
    public void markAllAsReadForRecipient(Long userId, String role) {
        notificationRepository.markAllAsReadForRecipient(userId, role);
    }
}
