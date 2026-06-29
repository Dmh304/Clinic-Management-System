package com.ecms.controller;

import com.ecms.dto.response.ApiResponse;
import com.ecms.dto.response.NotificationResponse;
import com.ecms.entity.User;
import com.ecms.repository.UserRepository;
import com.ecms.service.NotificationService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * UC-13: API thông báo (kiểu Facebook) cho người dùng đã đăng nhập.
 *
 * Thông báo của 1 người gồm: thông báo nhắm riêng họ (target_user_id) + thông báo
 * broadcast theo vai trò (target_role). Cả user id lẫn vai trò đều được suy ra từ
 * tài khoản đang đăng nhập, không tin tham số client (tránh đọc thông báo người khác).
 */
@RestController
@RequestMapping("/api/v1/notifications")
@RequiredArgsConstructor
public class NotificationController {

    private final NotificationService notificationService;
    private final UserRepository userRepository;

    /** Danh sách thông báo của người dùng (mới nhất trước). */
    @GetMapping
    public ResponseEntity<ApiResponse<List<NotificationResponse>>> getNotifications(
            Authentication authentication) {
        return ResponseEntity.ok(ApiResponse.success(
                notificationService.getForRecipient(resolveUserId(authentication), resolveRole(authentication))));
    }

    /** Số lượng thông báo chưa đọc của người dùng. */
    @GetMapping("/unread-count")
    public ResponseEntity<ApiResponse<Long>> getUnreadCount(Authentication authentication) {
        return ResponseEntity.ok(ApiResponse.success(
                notificationService.getUnreadCountForRecipient(resolveUserId(authentication),
                        resolveRole(authentication))));
    }

    /** Đánh dấu 1 thông báo là đã đọc. */
    @PatchMapping("/{id}/read")
    public ResponseEntity<ApiResponse<NotificationResponse>> markAsRead(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success(notificationService.markAsRead(id)));
    }

    /** Đánh dấu đã đọc toàn bộ thông báo của người dùng. */
    @PatchMapping("/mark-all-read")
    public ResponseEntity<ApiResponse<Void>> markAllAsRead(Authentication authentication) {
        notificationService.markAllAsReadForRecipient(resolveUserId(authentication), resolveRole(authentication));
        return ResponseEntity.ok(ApiResponse.success("Đã đánh dấu tất cả là đã đọc", null));
    }

    // id user hiện tại (theo email trong token)
    private Long resolveUserId(Authentication authentication) {
        if (authentication == null) {
            return null;
        }
        return userRepository.findByEmail(authentication.getName()).map(User::getId).orElse(null);
    }

    // Suy ra tên vai trò từ authority đầu tiên (bỏ tiền tố "ROLE_")
    private String resolveRole(Authentication authentication) {
        if (authentication == null || authentication.getAuthorities().isEmpty()) {
            return "";
        }
        String authority = authentication.getAuthorities().iterator().next().getAuthority();
        return authority.startsWith("ROLE_") ? authority.substring(5) : authority;
    }
}
