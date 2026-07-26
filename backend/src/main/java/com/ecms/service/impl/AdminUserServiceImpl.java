// UC-55 - Manage User Account
package com.ecms.service.impl;

import com.ecms.dto.request.CreateStaffUserRequest;
import com.ecms.dto.request.UpdateStaffUserRequest;
import com.ecms.dto.response.PageResponse;
import com.ecms.dto.response.StaffUserResponse;
import com.ecms.entity.AuthProvider;
import com.ecms.entity.Doctor;
import com.ecms.entity.LabTechnician;
import com.ecms.entity.Role;
import com.ecms.entity.Staff;
import com.ecms.entity.User;
import com.ecms.entity.UserStatus;
import com.ecms.exception.ConflictException;
import com.ecms.exception.ResourceNotFoundException;
import com.ecms.repository.DoctorRepository;
import com.ecms.repository.LabTechnicianRepository;
import com.ecms.repository.RoleRepository;
import com.ecms.repository.StaffRepository;
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
    // Mật khẩu cố định cho tài khoản ảo/demo — không gửi email nên phải là hằng số đã biết trước
    private static final String VIRTUAL_ACCOUNT_PASSWORD = "Password@123";

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuditLogService auditLogService;
    private final EmailService emailService;
    private final DoctorRepository doctorRepository;
    private final LabTechnicianRepository labTechnicianRepository;
    private final StaffRepository staffRepository;

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

        // Validate các field bắt buộc theo role trước khi tạo user
        validateRoleSpecificFields(request);

        boolean isVirtual = Boolean.TRUE.equals(request.getIsVirtual());

        User user = User.builder()
                .fullName(request.getFullName())
                .email(request.getEmail())
                .department(request.getDepartment())
                .role(role)
                .authProvider(AuthProvider.LOCAL)
                // Tài khoản ảo (demo, gmail không thật) không thể nhận email kích hoạt nên được tạo
                // ACTIVE ngay với mật khẩu cố định, thay vì PENDING_VERIFICATION + mật khẩu tạm ngẫu nhiên.
                .status(isVirtual ? UserStatus.ACTIVE : UserStatus.PENDING_VERIFICATION)
                .passwordHash(passwordEncoder.encode(isVirtual ? VIRTUAL_ACCOUNT_PASSWORD : TempPasswordGenerator.generate()))
                .isVirtual(isVirtual)
                .build();
        User saved = userRepository.save(user);

        // Tạo row trong bảng profile tương ứng với role để các module khác (appointment,
        // lab order...) có thể resolve đúng doctor/labTech/staff theo user_id.
        createProfileForRole(saved, request);

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

        if (user.getRole() != null && "ADMIN".equals(user.getRole().getName())) {
            throw new IllegalStateException("Không thể vô hiệu hoá tài khoản Admin");
        }

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
        boolean isVirtual = Boolean.TRUE.equals(user.getIsVirtual());

        // Tài khoản ảo không có email thật để nhận mật khẩu mới ngẫu nhiên — luôn set về
        // mật khẩu cố định đã biết trước, không gửi email.
        String tempPassword = isVirtual ? VIRTUAL_ACCOUNT_PASSWORD : TempPasswordGenerator.generate();
        user.setPasswordHash(passwordEncoder.encode(tempPassword));
        user.setFailedLoginAttempts(0);
        user.setLockUntil(null);
        if (user.getStatus() == UserStatus.LOCKED) {
            user.setStatus(UserStatus.ACTIVE);
        }
        User saved = userRepository.save(user);

        if (!isVirtual) {
            emailService.sendAdminPasswordResetEmail(saved.getEmail(), saved.getFullName(), tempPassword);
        }

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

    // Validate các field bắt buộc theo role (gọi trước khi save user để fail-fast)
    private void validateRoleSpecificFields(CreateStaffUserRequest request) {
        String roleName = request.getRole().trim().toUpperCase();
        if ("DOCTOR".equals(roleName)) {
            if (request.getSpecialty() == null || request.getSpecialty().isBlank()) {
                throw new IllegalArgumentException("Chuyên khoa (specialty) là bắt buộc khi tạo tài khoản bác sĩ");
            }
            if (request.getLicenseNumber() == null || request.getLicenseNumber().isBlank()) {
                throw new IllegalArgumentException("Số chứng chỉ hành nghề (licenseNumber) là bắt buộc khi tạo tài khoản bác sĩ");
            }
            if (doctorRepository.existsByLicenseNumber(request.getLicenseNumber().trim())) {
                throw new ConflictException("Số chứng chỉ hành nghề đã được đăng ký: " + request.getLicenseNumber());
            }
        }
    }

    // Tạo row trong bảng profile tương ứng ngay sau khi user được save.
    // Dùng user.getId() làm suffix code để đảm bảo unique mà không cần query MAX.
    // Toàn bộ nằm trong cùng @Transactional với createUser — nếu lỗi thì rollback cả user.
    private void createProfileForRole(User user, CreateStaffUserRequest request) {
        String roleName = user.getRole().getName();
        String codeId = "%06d".formatted(user.getId());

        switch (roleName) {
            case "DOCTOR" -> {
                Doctor doctor = Doctor.builder()
                        .user(user)
                        .doctorCode("DR" + codeId)
                        .fullName(user.getFullName())
                        .licenseNumber(request.getLicenseNumber().trim())
                        .specialization(request.getSpecialty().trim())
                        .department(user.getDepartment())
                        .email(user.getEmail())
                        .phone(request.getPhone())
                        .build();
                doctorRepository.save(doctor);
            }
            case "LAB_TECHNICIAN" -> {
                LabTechnician labTech = LabTechnician.builder()
                        .user(user)
                        .labTechCode("LAB" + codeId)
                        .fullName(user.getFullName())
                        .email(user.getEmail())
                        .phone(request.getPhone())
                        .build();
                labTechnicianRepository.save(labTech);
            }
            default -> {
                // NURSE, PHARMACIST, RECEPTIONIST, MANAGER, ADMIN → staffs
                String position = switch (roleName) {
                    case "RECEPTIONIST" -> "Lễ tân viên";
                    case "PHARMACIST"   -> "Dược sĩ";
                    case "NURSE"        -> "Điều dưỡng";
                    case "MANAGER"      -> "Quản lý";
                    case "ADMIN"        -> "Quản trị viên";
                    default             -> roleName;
                };
                Staff staff = Staff.builder()
                        .user(user)
                        .employeeCode("EMP" + codeId)
                        .fullName(user.getFullName())
                        .department(user.getDepartment())
                        .position(position)
                        .phoneNumber(request.getPhone())
                        .build();
                staffRepository.save(staff);
            }
        }
    }

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
        return userRepository.findByEmail(actorEmail).map(user -> user.getId()).orElse(null);
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
                .isVirtual(user.getIsVirtual())
                .build();
    }
}
