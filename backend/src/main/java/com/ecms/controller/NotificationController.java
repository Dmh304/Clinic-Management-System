package com.ecms.controller;

import com.ecms.dto.response.ApiResponse;
import com.ecms.dto.response.NotificationResponse;
import com.ecms.repository.UserRepository;
import com.ecms.service.NotificationService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * @author      ThangNB - HE201024
 * @contributor Lê Thị Bích Ngân - HE204710
 * @created     2026-07-11
 * @updated     2026-07-11
 *
 * In-app notification API for authenticated users
 * (UC-10 Receive System Notification).
 * Base URL: /api/v1/notifications
 *
 * A user's feed is the union of notifications addressed to them personally
 * ({@code target_user_id}) and role broadcasts ({@code target_role}).
 *
 * Validate: both the user id and the role are derived from the authenticated
 * token, never from a client parameter — otherwise a caller could pass someone
 * else's id and read their notifications.
 */
@RestController
@RequestMapping("/api/v1/notifications")
@RequiredArgsConstructor
public class NotificationController {

    private final NotificationService notificationService;
    private final UserRepository userRepository;

    /**
     * Returns the caller's notification feed, newest first
     * (UC-10 normal flow step 6).
     *
     * @param authentication the authenticated principal
     * @return personal notifications plus role broadcasts
     */
    @GetMapping
    public ResponseEntity<ApiResponse<List<NotificationResponse>>> getNotifications(
            Authentication authentication) {
        return ResponseEntity.ok(ApiResponse.success(
                notificationService.getForRecipient(resolveUserId(authentication), resolveRole(authentication))));
    }

    /**
     * Unread count driving the notification bell badge (UC-10 POST-2).
     *
     * @param authentication the authenticated principal
     * @return number of unread notifications for this user
     */
    @GetMapping("/unread-count")
    public ResponseEntity<ApiResponse<Long>> getUnreadCount(Authentication authentication) {
        return ResponseEntity.ok(ApiResponse.success(
                notificationService.getUnreadCountForRecipient(resolveUserId(authentication),
                        resolveRole(authentication))));
    }

    /**
     * Marks one notification read (UC-10 normal flow step 8).
     *
     * @param id notification primary key
     * @return the updated notification
     */
    @PatchMapping("/{id}/read")
    public ResponseEntity<ApiResponse<NotificationResponse>> markAsRead(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success(notificationService.markAsRead(id)));
    }

    /**
     * Marks every notification of the caller read and resets the badge to 0
     * (UC-10 ALT-1 "Mark all as read").
     *
     * @param authentication the authenticated principal
     */
    @PatchMapping("/mark-all-read")
    public ResponseEntity<ApiResponse<Void>> markAllAsRead(Authentication authentication) {
        notificationService.markAllAsReadForRecipient(resolveUserId(authentication), resolveRole(authentication));
        return ResponseEntity.ok(ApiResponse.success("Đã đánh dấu tất cả là đã đọc", null));
    }

    /**
     * Resolves the current user id from the email carried in the token.
     *
     * @param authentication the authenticated principal, may be null
     * @return the caller's user id, or null when unauthenticated
     *
     * Validate: taking the identity from the token rather than the request is
     * what stops a caller reading another user's notifications.
     */
    private Long resolveUserId(Authentication authentication) {
        if (authentication == null) {
            return null;
        }
        return userRepository.findByEmail(authentication.getName()).map(user -> user.getId()).orElse(null);
    }

    /**
     * Derives the role name from the first granted authority, stripping the
     * Spring Security "ROLE_" prefix so it matches {@code target_role} values.
     *
     * @param authentication the authenticated principal, may be null
     * @return the role name, or an empty string when unauthenticated
     */
    private String resolveRole(Authentication authentication) {
        if (authentication == null || authentication.getAuthorities().isEmpty()) {
            return "";
        }
        String authority = authentication.getAuthorities().iterator().next().getAuthority();
        return authority.startsWith("ROLE_") ? authority.substring(5) : authority;
    }
}
