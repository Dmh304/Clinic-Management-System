// UC-55 - Manage User Account
// Service cho Admin quản lý tài khoản PATIENT — phạm vi hẹp hơn nhân viên: chỉ hỗ trợ mở khóa
// tài khoản bị khóa và đặt lại mật khẩu khi patient quên mật khẩu. Không activate/deactivate/
// sửa thông tin hồ sơ (patient tự quản lý qua UC-01, hồ sơ y tế quản lý qua Patient entity riêng).
package com.ecms.service;

import com.ecms.dto.response.PageResponse;
import com.ecms.dto.response.PatientAccountResponse;
import com.ecms.entity.UserStatus;

public interface AdminPatientService {

    // Danh sách tài khoản patient có phân trang, filter theo status/từ khoá tên-hoặc-email
    PageResponse<PatientAccountResponse> searchPatients(UserStatus status, String keyword, int page, int size);

    // Mở khóa tài khoản patient đang LOCKED về lại ACTIVE
    PatientAccountResponse unlockPatient(Long id, String actorEmail, String ipAddress);

    // Đặt lại mật khẩu cho patient quên mật khẩu: sinh mật khẩu tạm mới và gửi email
    PatientAccountResponse resetPatientPassword(Long id, String actorEmail, String ipAddress);
}
