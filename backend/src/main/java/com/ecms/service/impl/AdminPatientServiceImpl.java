// UC-55 - Manage User Account
package com.ecms.service.impl;

import com.ecms.dto.response.PageResponse;
import com.ecms.dto.response.PatientAccountResponse;
import com.ecms.entity.AuthProvider;
import com.ecms.entity.User;
import com.ecms.entity.UserStatus;
import com.ecms.exception.ResourceNotFoundException;
import com.ecms.repository.UserRepository;
import com.ecms.service.AdminPatientService;
import com.ecms.service.AuditLogService;
import com.ecms.service.EmailService;
import com.ecms.util.TempPasswordGenerator;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class AdminPatientServiceImpl implements AdminPatientService {

    private static final String PATIENT_ROLE = "PATIENT";

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuditLogService auditLogService;
    private final EmailService emailService;

    @Override
    @Transactional(readOnly = true)
    public PageResponse<PatientAccountResponse> searchPatients(UserStatus status, String keyword, int page, int size) {
        var pageable = PageRequest.of(page, size, Sort.by("createdAt").descending());
        String likeKeyword = (keyword == null || keyword.isBlank()) ? null : "%" + keyword.trim().toLowerCase() + "%";
        var result = userRepository.searchPatientUsers(status, likeKeyword, pageable);
        return PageResponse.of(result.map(this::toResponse));
    }

    @Override
    @Transactional
    public PatientAccountResponse unlockPatient(Long id, String actorEmail, String ipAddress) {
        User user = getPatientOrThrow(id);

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
    public PatientAccountResponse resetPatientPassword(Long id, String actorEmail, String ipAddress) {
        User user = getPatientOrThrow(id);

        // Nhất quán với forgotPassword()/resetPassword() tự phục vụ: tài khoản Google không có
        // mật khẩu local và không nên được cấp một cái mới qua đường admin — tránh tạo ra tài
        // khoản "hybrid" (đăng nhập được cả 2 cách) ngoài chủ đích thiết kế.
        if (user.getAuthProvider() == AuthProvider.GOOGLE) {
            throw new IllegalArgumentException("Tài khoản này đăng nhập bằng Google, không có mật khẩu để đặt lại");
        }

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

    private User getPatientOrThrow(Long id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy người dùng"));
        if (user.getRole() == null || !PATIENT_ROLE.equals(user.getRole().getName())) {
            throw new ResourceNotFoundException("Không tìm thấy người dùng");
        }
        return user;
    }

    private Long resolveActorId(String actorEmail) {
        return userRepository.findByEmail(actorEmail).map(User::getId).orElse(null);
    }

    private PatientAccountResponse toResponse(User user) {
        return PatientAccountResponse.builder()
                .id(user.getId())
                .fullName(user.getFullName())
                .email(user.getEmail())
                .phone(user.getPhone())
                .status(user.getStatus() != null ? user.getStatus().name() : null)
                .createdAt(user.getCreatedAt())
                .build();
    }
}
