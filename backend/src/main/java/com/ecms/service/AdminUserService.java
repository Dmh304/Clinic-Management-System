// UC-55 - Manage User Account
// Service cho Admin quản lý tài khoản NHÂN VIÊN (DOCTOR/RECEPTIONIST/LAB_TECHNICIAN/
// PHARMACIST/MANAGER/NURSE/ADMIN). Tài khoản PATIENT không được tạo/sửa qua service này —
// patient tự đăng ký (UC-01) hoặc được receptionist đăng ký walk-in (UC-13).
package com.ecms.service;

import com.ecms.dto.request.CreateStaffUserRequest;
import com.ecms.dto.request.UpdateStaffUserRequest;
import com.ecms.dto.response.PageResponse;
import com.ecms.dto.response.StaffUserResponse;
import com.ecms.entity.UserStatus;

public interface AdminUserService {

    // Danh sách tài khoản nhân viên có phân trang, filter theo role/status/từ khoá tên-hoặc-email
    PageResponse<StaffUserResponse> searchUsers(String role, UserStatus status, String keyword, int page, int size);

    // Chi tiết một tài khoản nhân viên
    StaffUserResponse getUser(Long id);

    // Tạo tài khoản nhân viên mới ở trạng thái chưa kích hoạt (không gửi email ngay)
    StaffUserResponse createUser(CreateStaffUserRequest request, String actorEmail, String ipAddress);

    // Sửa fullName/role/department của một tài khoản nhân viên
    StaffUserResponse updateUser(Long id, UpdateStaffUserRequest request, String actorEmail, String ipAddress);

    // Kích hoạt tài khoản: sinh mật khẩu tạm mới, set ACTIVE, gửi email chào mừng kèm mật khẩu tạm
    StaffUserResponse activateUser(Long id, String actorEmail, String ipAddress);

    // Vô hiệu hoá tài khoản: set DISABLED và thu hồi mọi JWT đã cấp (tăng tokenVersion)
    StaffUserResponse deactivateUser(Long id, String actorEmail, String ipAddress);

    // Mở khóa tài khoản đang LOCKED (do nhập sai mật khẩu quá số lần cho phép) về lại ACTIVE
    StaffUserResponse unlockUser(Long id, String actorEmail, String ipAddress);

    // Đặt lại mật khẩu cho tài khoản (dùng khi nhân viên quên mật khẩu): sinh mật khẩu tạm mới và gửi email
    StaffUserResponse resetPassword(Long id, String actorEmail, String ipAddress);

    // Soft delete: chỉ áp dụng cho tài khoản đã DISABLED — ẩn khỏi danh sách, không xóa cứng bản ghi (BR-09)
    void softDeleteUser(Long id, String actorEmail, String ipAddress);
}
