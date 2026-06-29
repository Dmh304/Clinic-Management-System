// UC-55 - Manage User Account
package com.ecms.service.impl;

import com.ecms.dto.request.CreateStaffUserRequest;
import com.ecms.dto.request.UpdateStaffUserRequest;
import com.ecms.dto.response.PageResponse;
import com.ecms.dto.response.StaffUserResponse;
import com.ecms.entity.AuthProvider;
import com.ecms.entity.Role;
import com.ecms.entity.User;
import com.ecms.entity.UserStatus;
import com.ecms.exception.ConflictException;
import com.ecms.exception.ResourceNotFoundException;
import com.ecms.repository.RoleRepository;
import com.ecms.repository.UserRepository;
import com.ecms.service.AdminUserService;
import com.ecms.service.AuditLogService;
import com.ecms.service.EmailService;
import com.ecms.util.TempPasswordGenerator;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class AdminUserServiceImpl implements AdminUserService {

    private static final String PATIENT_ROLE = "PATIENT";

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuditLogService auditLogService;
    private final EmailService emailService;

    @Override
    @Transactional(readOnly = true)
    public PageResponse<StaffUserResponse> searchUsers(String role, UserStatus status, String keyword, int page, int size) {
        var pageable = PageRequest.of(page, size, Sort.by("createdAt").descending());
        String normalizedRole = (role == null || role.isBlank()) ? null : role.trim().toUpperCase();
        String likeKeyword = (keyword == null || keyword.isBlank()) ? null : "%" + keyword.trim().toLowerCase() + "%";
        var result = userRepository.searchStaffUsers(normalizedRole, status, likeKeyword, pageable);
        return PageResponse.of(result.map(this::toResponse));
    }

    @Override
    @Transactional(readOnly = true)
    public StaffUserResponse getUser(Long id) {
        return toResponse(getStaffUserOrThrow(id));
    }

    @Override
    @Transactional
    public StaffUserResponse createUser(CreateStaffUserRequest request, String actorEmail, String ipAddress) {
        Role role = resolveStaffRole(request.getRole());

        if (userRepository.existsByEmail(request.getEmail())) {
            throw new ConflictException("This email is already registered.");
        }

        User user = User.builder()
                .fullName(request.getFullName())
                .email(request.getEmail())
                .department(request.getDepartment())
                .role(role)
                .authProvider(AuthProvider.LOCAL)
                .status(UserStatus.PENDING_VERIFICATION)
                .passwordHash(passwordEncoder.encode(TempPasswordGenerator.generate()))
                .build();
        User saved = userRepository.save(user);

        auditLogService.log(resolveActorId(actorEmail), "CREATE_USER", "User", String.valueOf(saved.getId()),
                null, snapshot(saved), ipAddress);

        return toResponse(saved);
    }

    @Override
    @Transactional
    public StaffUserResponse updateUser(Long id, UpdateStaffUserRequest request, String actorEmail, String ipAddress) {
        User user = getStaffUserOrThrow(id);
        Role newRole = resolveStaffRole(request.getRole());

        Map<String, Object> oldValue = snapshot(user);

        user.setFullName(request.getFullName());
        user.setRole(newRole);
        user.setDepartment(request.getDepartment());
        User saved = userRepository.save(user);

        auditLogService.log(resolveActorId(actorEmail), "EDIT_USER", "User", String.valueOf(saved.getId()),
                oldValue, snapshot(saved), ipAddress);

        return toResponse(saved);
    }

    @Override
    @Transactional
    public StaffUserResponse activateUser(Long id, String actorEmail, String ipAddress) {
        User user = getStaffUserOrThrow(id);

        if (user.getStatus() == UserStatus.ACTIVE) {
            throw new IllegalStateException("Tài khoản đã được kích hoạt");
        }

        UserStatus oldStatus = user.getStatus();
        String tempPassword = TempPasswordGenerator.generate();
        user.setPasswordHash(passwordEncoder.encode(tempPassword));
        user.setStatus(UserStatus.ACTIVE);
        user.setFailedLoginAttempts(0);
        user.setLockUntil(null);
        User saved = userRepository.save(user);

        emailService.sendNewStaffAccountEmail(saved.getEmail(), saved.getFullName(), tempPassword);

        auditLogService.log(resolveActorId(actorEmail), "ACTIVATE_ACCOUNT", "User", String.valueOf(saved.getId()),
                oldStatus.name(), UserStatus.ACTIVE.name(), ipAddress);

        return toResponse(saved);
    }

    @Override
    @Transactional
    public StaffUserResponse deactivateUser(Long id, String actorEmail, String ipAddress) {
        User user = getStaffUserOrThrow(id);

        if (user.getStatus() == UserStatus.DISABLED) {
            throw new IllegalStateException("Tài khoản đã bị vô hiệu hoá");
        }

        UserStatus oldStatus = user.getStatus();
        user.setStatus(UserStatus.DISABLED);
        user.setTokenVersion(user.getTokenVersion() + 1);
        User saved = userRepository.save(user);

        auditLogService.log(resolveActorId(actorEmail), "DEACTIVATE_ACCOUNT", "User", String.valueOf(saved.getId()),
                oldStatus.name(), UserStatus.DISABLED.name(), ipAddress);

        return toResponse(saved);
    }

    @Override
    @Transactional
    public StaffUserResponse unlockUser(Long id, String actorEmail, String ipAddress) {
        User user = getStaffUserOrThrow(id);

        if (user.getStatus() != UserStatus.LOCKED) {
            throw new IllegalStateException("Tài khoản không ở trạng thái bị khóa");
        }

        UserStatus oldStatus = user.getStatus();
        user.setStatus(UserStatus.ACTIVE);
        user.setFailedLoginAttempts(0);
        user.setLockUntil(null);
        User saved = userRepository.save(user);

        auditLogService.log(resolveActorId(actorEmail), "UNLOCK_ACCOUNT", "User", String.valueOf(saved.getId()),
                oldStatus.name(), UserStatus.ACTIVE.name(), ipAddress);

        return toResponse(saved);
    }

    @Override
    @Transactional
    public StaffUserResponse resetPassword(Long id, String actorEmail, String ipAddress) {
        User user = getStaffUserOrThrow(id);

        String tempPassword = TempPasswordGenerator.generate();
        user.setPasswordHash(passwordEncoder.encode(tempPassword));
        user.setFailedLoginAttempts(0);
        user.setLockUntil(null);
        if (user.getStatus() == UserStatus.LOCKED) {
            user.setStatus(UserStatus.ACTIVE);
        }
        User saved = userRepository.save(user);

        emailService.sendAdminPasswordResetEmail(saved.getEmail(), saved.getFullName(), tempPassword);

        auditLogService.log(resolveActorId(actorEmail), "RESET_PASSWORD", "User", String.valueOf(saved.getId()),
                null, null, ipAddress);

        return toResponse(saved);
    }

    @Override
    @Transactional
    public void softDeleteUser(Long id, String actorEmail, String ipAddress) {
        User user = getStaffUserOrThrow(id);

        if (user.getStatus() != UserStatus.DISABLED) {
            throw new IllegalStateException("Chỉ có thể xóa tài khoản đã bị vô hiệu hoá (DISABLED)");
        }

        user.setDeletedAt(LocalDateTime.now());
        userRepository.save(user);

        auditLogService.log(resolveActorId(actorEmail), "DELETE_USER", "User", String.valueOf(id),
                snapshot(user), null, ipAddress);
    }

    // ───────────────────────────── Helpers ─────────────────────────────

    // Tải tài khoản theo id; tài khoản PATIENT bị coi như không tồn tại trong phạm vi UC-55
    private User getStaffUserOrThrow(Long id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy người dùng"));
        if (user.getRole() != null && PATIENT_ROLE.equals(user.getRole().getName())) {
            throw new ResourceNotFoundException("Không tìm thấy người dùng");
        }
        return user;
    }

    // Tìm vai trò theo tên, chặn PATIENT (UC-55 chỉ quản lý tài khoản nhân viên)
    private Role resolveStaffRole(String roleName) {
        if (PATIENT_ROLE.equalsIgnoreCase(roleName)) {
            throw new IllegalArgumentException("Không thể tạo hoặc gán vai trò PATIENT cho tài khoản qua màn hình quản lý nhân viên");
        }
        return roleRepository.findByName(roleName)
                .orElseThrow(() -> new ResourceNotFoundException("Vai trò không tồn tại: " + roleName));
    }

    private Long resolveActorId(String actorEmail) {
        return userRepository.findByEmail(actorEmail).map(User::getId).orElse(null);
    }

    private Map<String, Object> snapshot(User user) {
        Map<String, Object> map = new HashMap<>();
        map.put("fullName", user.getFullName());
        map.put("email", user.getEmail());
        map.put("role", user.getRole() != null ? user.getRole().getName() : null);
        map.put("department", user.getDepartment());
        map.put("status", user.getStatus() != null ? user.getStatus().name() : null);
        return map;
    }

    private StaffUserResponse toResponse(User user) {
        return StaffUserResponse.builder()
                .id(user.getId())
                .fullName(user.getFullName())
                .email(user.getEmail())
                .role(user.getRole() != null ? user.getRole().getName() : null)
                .department(user.getDepartment())
                .status(user.getStatus() != null ? user.getStatus().name() : null)
                .createdAt(user.getCreatedAt())
                .build();
    }
}
