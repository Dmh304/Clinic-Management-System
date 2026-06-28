// UC-57 - Manage System Audit Log / UC-55 - Manage User Account
// Controller dành cho Admin: xem/filter/export audit log (UC-57, append-only — không có
// endpoint update/delete) và quản lý tài khoản nhân viên (UC-55 — không có endpoint xóa cứng,
// xem BR-09).
package com.ecms.controller;

import com.ecms.dto.request.CreateNotificationTemplateRequest;
import com.ecms.dto.request.CreateStaffUserRequest;
import com.ecms.dto.request.UpdateClinicInfoRequest;
import com.ecms.dto.request.UpdateNotificationTemplateRequest;
import com.ecms.dto.request.UpdateStaffUserRequest;
import com.ecms.dto.response.ApiResponse;
import com.ecms.dto.response.AuditLogResponse;
import com.ecms.dto.response.ClinicInfoResponse;
import com.ecms.dto.response.NotificationTemplateResponse;
import com.ecms.dto.response.PageResponse;
import com.ecms.dto.response.PatientAccountResponse;
import com.ecms.dto.response.RolePermissionResponse;
import com.ecms.dto.response.StaffUserResponse;
import com.ecms.entity.UserStatus;
import com.ecms.service.AdminPatientService;
import com.ecms.service.AdminUserService;
import com.ecms.service.AuditLogService;
import com.ecms.service.NotificationTemplateService;
import com.ecms.service.SystemConfigService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.io.IOException;
import java.time.LocalDateTime;
import java.util.List;

@RestController
@RequestMapping("/api/v1/admin")
@RequiredArgsConstructor
public class AdminController {

    private final AuditLogService auditLogService;
    private final AdminUserService adminUserService;
    private final AdminPatientService adminPatientService;
    private final SystemConfigService systemConfigService;
    private final NotificationTemplateService notificationTemplateService;

    // ───────────────────────── UC-55: Manage User Account ─────────────────────────

    // Tạo tài khoản nhân viên mới (trạng thái chưa kích hoạt, không gửi email ngay)
    @PostMapping("/users")
    public ResponseEntity<ApiResponse<StaffUserResponse>> createUser(
            @Valid @RequestBody CreateStaffUserRequest request,
            Authentication authentication, HttpServletRequest httpRequest) {
        var data = adminUserService.createUser(request, authentication.getName(), clientIp(httpRequest));
        return ResponseEntity.ok(ApiResponse.success("Tạo tài khoản thành công", data));
    }

    // Danh sách tài khoản nhân viên có phân trang, filter theo role/status/từ khoá tên-hoặc-email
    @GetMapping("/users")
    public ResponseEntity<ApiResponse<PageResponse<StaffUserResponse>>> getUsers(
            @RequestParam(required = false) String role,
            @RequestParam(required = false) UserStatus status,
            @RequestParam(required = false) String keyword,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        var data = adminUserService.searchUsers(role, status, keyword, page, size);
        return ResponseEntity.ok(ApiResponse.success(data));
    }

    // Chi tiết một tài khoản nhân viên
    @GetMapping("/users/{id}")
    public ResponseEntity<ApiResponse<StaffUserResponse>> getUserById(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success(adminUserService.getUser(id)));
    }

    // Sửa fullName/role/department của một tài khoản nhân viên
    @PutMapping("/users/{id}")
    public ResponseEntity<ApiResponse<StaffUserResponse>> updateUser(
            @PathVariable Long id, @Valid @RequestBody UpdateStaffUserRequest request,
            Authentication authentication, HttpServletRequest httpRequest) {
        var data = adminUserService.updateUser(id, request, authentication.getName(), clientIp(httpRequest));
        return ResponseEntity.ok(ApiResponse.success("Cập nhật tài khoản thành công", data));
    }

    // Kích hoạt tài khoản: sinh mật khẩu tạm mới, set ACTIVE, gửi email chào mừng kèm mật khẩu tạm
    @PatchMapping("/users/{id}/activate")
    public ResponseEntity<ApiResponse<StaffUserResponse>> activateUser(
            @PathVariable Long id, Authentication authentication, HttpServletRequest httpRequest) {
        var data = adminUserService.activateUser(id, authentication.getName(), clientIp(httpRequest));
        return ResponseEntity.ok(ApiResponse.success("Kích hoạt tài khoản thành công", data));
    }

    // Vô hiệu hoá tài khoản: set DISABLED và thu hồi mọi JWT đã cấp cho tài khoản này
    @PatchMapping("/users/{id}/deactivate")
    public ResponseEntity<ApiResponse<StaffUserResponse>> deactivateUser(
            @PathVariable Long id, Authentication authentication, HttpServletRequest httpRequest) {
        var data = adminUserService.deactivateUser(id, authentication.getName(), clientIp(httpRequest));
        return ResponseEntity.ok(ApiResponse.success("Vô hiệu hoá tài khoản thành công", data));
    }

    // Mở khóa tài khoản nhân viên đang bị khóa do nhập sai mật khẩu quá số lần cho phép
    @PatchMapping("/users/{id}/unlock")
    public ResponseEntity<ApiResponse<StaffUserResponse>> unlockUser(
            @PathVariable Long id, Authentication authentication, HttpServletRequest httpRequest) {
        var data = adminUserService.unlockUser(id, authentication.getName(), clientIp(httpRequest));
        return ResponseEntity.ok(ApiResponse.success("Mở khóa tài khoản thành công", data));
    }

    // Đặt lại mật khẩu cho tài khoản nhân viên quên mật khẩu: sinh mật khẩu tạm mới và gửi email
    @PatchMapping("/users/{id}/reset-password")
    public ResponseEntity<ApiResponse<StaffUserResponse>> resetUserPassword(
            @PathVariable Long id, Authentication authentication, HttpServletRequest httpRequest) {
        var data = adminUserService.resetPassword(id, authentication.getName(), clientIp(httpRequest));
        return ResponseEntity.ok(ApiResponse.success("Đặt lại mật khẩu thành công, email đã được gửi", data));
    }

    // Soft delete: chỉ áp dụng cho tài khoản đã DISABLED — ẩn khỏi danh sách, không xóa cứng bản ghi (BR-09)
    @DeleteMapping("/users/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteUser(
            @PathVariable Long id, Authentication authentication, HttpServletRequest httpRequest) {
        adminUserService.softDeleteUser(id, authentication.getName(), clientIp(httpRequest));
        return ResponseEntity.ok(ApiResponse.success("Đã xóa tài khoản khỏi danh sách", null));
    }

    // ───────────────────────── UC-55: Manage Patient Account (mở khóa + reset mật khẩu) ─────────────────────────

    // Danh sách tài khoản patient có phân trang, filter theo status/từ khoá tên-hoặc-email
    @GetMapping("/patients")
    public ResponseEntity<ApiResponse<PageResponse<PatientAccountResponse>>> getPatients(
            @RequestParam(required = false) UserStatus status,
            @RequestParam(required = false) String keyword,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        var data = adminPatientService.searchPatients(status, keyword, page, size);
        return ResponseEntity.ok(ApiResponse.success(data));
    }

    // Mở khóa tài khoản patient đang bị khóa
    @PatchMapping("/patients/{id}/unlock")
    public ResponseEntity<ApiResponse<PatientAccountResponse>> unlockPatient(
            @PathVariable Long id, Authentication authentication, HttpServletRequest httpRequest) {
        var data = adminPatientService.unlockPatient(id, authentication.getName(), clientIp(httpRequest));
        return ResponseEntity.ok(ApiResponse.success("Mở khóa tài khoản thành công", data));
    }

    // Đặt lại mật khẩu cho patient quên mật khẩu: sinh mật khẩu tạm mới và gửi email
    @PatchMapping("/patients/{id}/reset-password")
    public ResponseEntity<ApiResponse<PatientAccountResponse>> resetPatientPassword(
            @PathVariable Long id, Authentication authentication, HttpServletRequest httpRequest) {
        var data = adminPatientService.resetPatientPassword(id, authentication.getName(), clientIp(httpRequest));
        return ResponseEntity.ok(ApiResponse.success("Đặt lại mật khẩu thành công, email đã được gửi", data));
    }

    // ───────────────────────── UC-56: Configure System and Data ─────────────────────────

    // Đọc thông tin chung của clinic (tên, địa chỉ, số điện thoại, giờ làm việc)
    @GetMapping("/config/clinic-info")
    public ResponseEntity<ApiResponse<ClinicInfoResponse>> getClinicInfo() {
        return ResponseEntity.ok(ApiResponse.success(systemConfigService.getClinicInfo()));
    }

    // Cập nhật thông tin chung của clinic
    @PutMapping("/config/clinic-info")
    public ResponseEntity<ApiResponse<ClinicInfoResponse>> updateClinicInfo(
            @Valid @RequestBody UpdateClinicInfoRequest request,
            Authentication authentication, HttpServletRequest httpRequest) {
        var data = systemConfigService.updateClinicInfo(request, authentication.getName(), clientIp(httpRequest));
        return ResponseEntity.ok(ApiResponse.success("Cập nhật thông tin phòng khám thành công", data));
    }

    // Danh sách mẫu thông báo (email/SMS/in-app)
    @GetMapping("/config/notification-templates")
    public ResponseEntity<ApiResponse<List<NotificationTemplateResponse>>> getNotificationTemplates() {
        return ResponseEntity.ok(ApiResponse.success(notificationTemplateService.getAll()));
    }

    // Tạo mẫu thông báo mới
    @PostMapping("/config/notification-templates")
    public ResponseEntity<ApiResponse<NotificationTemplateResponse>> createNotificationTemplate(
            @Valid @RequestBody CreateNotificationTemplateRequest request,
            Authentication authentication, HttpServletRequest httpRequest) {
        var data = notificationTemplateService.create(request, authentication.getName(), clientIp(httpRequest));
        return ResponseEntity.ok(ApiResponse.success("Tạo template thành công", data));
    }

    // Sửa subject/body/variablesHint của một mẫu thông báo (không đổi templateKey/channel)
    @PutMapping("/config/notification-templates/{id}")
    public ResponseEntity<ApiResponse<NotificationTemplateResponse>> updateNotificationTemplate(
            @PathVariable Long id, @Valid @RequestBody UpdateNotificationTemplateRequest request,
            Authentication authentication, HttpServletRequest httpRequest) {
        var data = notificationTemplateService.update(id, request, authentication.getName(), clientIp(httpRequest));
        return ResponseEntity.ok(ApiResponse.success("Cập nhật template thành công", data));
    }

    // Soft "delete": vô hiệu hoá template (BR-09, không hard delete)
    @PatchMapping("/config/notification-templates/{id}/deactivate")
    public ResponseEntity<ApiResponse<NotificationTemplateResponse>> deactivateNotificationTemplate(
            @PathVariable Long id, Authentication authentication, HttpServletRequest httpRequest) {
        var data = notificationTemplateService.deactivate(id, authentication.getName(), clientIp(httpRequest));
        return ResponseEntity.ok(ApiResponse.success("Đã vô hiệu hoá template", data));
    }

    // Hard-delete bị chặn tuyệt đối cho config/template (BR-09) — dùng deactivate ở trên
    @DeleteMapping("/config/notification-templates/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteNotificationTemplate(@PathVariable Long id) {
        return ResponseEntity.badRequest().body(ApiResponse.error(
                "This item is in use. Deactivate instead of deleting."));
    }

    // Danh sách role + quyền tương ứng — read-only, lấy từ bảng tra cứu tĩnh trong code
    @GetMapping("/config/roles-permissions")
    public ResponseEntity<ApiResponse<List<RolePermissionResponse>>> getRolesPermissions() {
        return ResponseEntity.ok(ApiResponse.success(systemConfigService.getRolesPermissions()));
    }

    // Lấy IP thật của client, ưu tiên header X-Forwarded-For nếu request đi qua proxy/load balancer
    private String clientIp(HttpServletRequest request) {
        String forwarded = request.getHeader("X-Forwarded-For");
        if (forwarded != null && !forwarded.isBlank()) {
            return forwarded.split(",")[0].trim();
        }
        return request.getRemoteAddr();
    }

    // Danh sách audit log có phân trang, kết hợp được nhiều điều kiện filter cùng lúc
    @GetMapping("/audit-logs")
    public ResponseEntity<ApiResponse<PageResponse<AuditLogResponse>>> getAuditLogs(
            @RequestParam(required = false) Long actorId,
            @RequestParam(required = false) String action,
            @RequestParam(required = false) String entityType,
            @RequestParam(required = false) String entityId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime dateFrom,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime dateTo,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        var data = auditLogService.search(actorId, action, entityType, entityId, dateFrom, dateTo, page, size);
        return ResponseEntity.ok(ApiResponse.success(data));
    }

    // Chi tiết một bản ghi audit log (xem before/after)
    @GetMapping("/audit-logs/{id}")
    public ResponseEntity<ApiResponse<AuditLogResponse>> getAuditLogById(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success(auditLogService.getById(id)));
    }

    // Export CSV đúng theo các điều kiện filter đang áp dụng
    @GetMapping("/audit-logs/export")
    public void exportAuditLogs(
            @RequestParam(required = false) Long actorId,
            @RequestParam(required = false) String action,
            @RequestParam(required = false) String entityType,
            @RequestParam(required = false) String entityId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime dateFrom,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime dateTo,
            HttpServletResponse response) throws IOException {
        auditLogService.exportCsv(actorId, action, entityType, entityId, dateFrom, dateTo, response);
    }
}
