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
    private static final String ROLE_MANAGER = "MANAGER";
    private static final String ROLE_PHARMACIST = "PHARMACIST";
    private static final String ROLE_LAB_TECHNICIAN = "LAB_TECHNICIAN";

    private final NotificationRepository notificationRepository;

    /** Giá trị mặc định cho các overload cũ (3 tham số) — lịch sử mọi thông báo có kèm ID
     *  đều là lịch hẹn, nên giữ nguyên hành vi cũ khi caller không khai báo entityType. */
    private static final String DEFAULT_ENTITY_TYPE = "APPOINTMENT";

    @Override
    @Transactional
    public void createForReceptionists(String message, Long relatedAppointmentId) {
        createForReceptionists(message, relatedAppointmentId, DEFAULT_ENTITY_TYPE);
    }

    @Override
    @Transactional
    public void createForReceptionists(String message, Long relatedEntityId, String relatedEntityType) {
        notificationRepository.save(Notification.builder()
                .message(message)
                .targetRole(ROLE_RECEPTIONIST)
                .relatedAppointmentId(relatedEntityId)
                .relatedEntityType(relatedEntityType)
                .isRead(false)
                .build());
    }

    @Override
    @Transactional
    public void createForPharmacists(String message, Long relatedAppointmentId) {
        createForRole(ROLE_PHARMACIST, message, relatedAppointmentId, DEFAULT_ENTITY_TYPE);
    }

    @Override
    @Transactional
    public void createForLabTechnicians(String message, Long relatedAppointmentId) {
        createForRole(ROLE_LAB_TECHNICIAN, message, relatedAppointmentId, DEFAULT_ENTITY_TYPE);
    }

    @Override
    @Transactional
    public void createForRole(String role, String message, Long relatedAppointmentId) {
        createForRole(role, message, relatedAppointmentId, DEFAULT_ENTITY_TYPE);
    }

    @Override
    @Transactional
    public void createForRole(String role, String message, Long relatedEntityId, String relatedEntityType) {
        notificationRepository.save(Notification.builder()
                .message(message)
                .targetRole(role)
                .relatedAppointmentId(relatedEntityId)
                .relatedEntityType(relatedEntityType)
                .isRead(false)
                .build());
    }

    /**
     * Trường hợp riêng hay dùng của createForRole — giữ lại cho các caller UC-48.
     */
    @Override
    @Transactional
    public void createForManagers(String message, Long relatedAppointmentId) {
        createForRole(ROLE_MANAGER, message, relatedAppointmentId, DEFAULT_ENTITY_TYPE);
    }

    @Override
    @Transactional
    public void createForManagers(String message, Long relatedEntityId, String relatedEntityType) {
        createForRole(ROLE_MANAGER, message, relatedEntityId, relatedEntityType);
    }

    @Override
    @Transactional
    public void createForUser(Long userId, String message, Long relatedAppointmentId) {
        createForUser(userId, message, relatedAppointmentId, DEFAULT_ENTITY_TYPE);
    }

    @Override
    @Transactional
    public void createForUser(Long userId, String message, Long relatedEntityId, String relatedEntityType) {
        if (userId == null) {
            return; // bệnh nhân vãng lai không có tài khoản -> bỏ qua, không tạo thông báo
        }
        notificationRepository.save(Notification.builder()
                .message(message)
                .targetUserId(userId)
                .relatedAppointmentId(relatedEntityId)
                .relatedEntityType(relatedEntityType)
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

    @Override
    public void createForLabTechnicians(String message, Long relatedAppointmentId) {
        notificationRepository.save(Notification.builder()
                .message(message)
                .targetRole(ROLE_LAB_TECHNICIAN)
                .relatedAppointmentId(relatedAppointmentId)
                .isRead(false)
                .build());
    }
}
