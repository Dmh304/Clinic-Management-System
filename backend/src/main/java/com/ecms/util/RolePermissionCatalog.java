// UC-56 - Configure System and Data
// Bảng tra cứu TĨNH (hard-coded) role -> danh sách quyền, chỉ dùng để HIỂN THỊ read-only
// trên màn hình "Roles & Permissions" của Admin. Hệ thống hiện tại dùng RBAC tĩnh qua
// hasRole()/hasAnyRole() khai báo trực tiếp trong SecurityConfig — danh sách dưới đây là
// bản tóm tắt thủ công của các quyền đó, KHÔNG phải nguồn áp dụng quyền thực tế (nguồn thực
// tế vẫn là SecurityConfig). Việc cấu hình quyền động qua DB nằm ngoài phạm vi UC-56.
package com.ecms.util;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

public final class RolePermissionCatalog {

    private static final Map<String, List<String>> ROLE_PERMISSIONS = new LinkedHashMap<>();

    static {
        ROLE_PERMISSIONS.put("ADMIN", List.of(
                "Quản lý tài khoản nhân viên & bệnh nhân (UC-55)",
                "Xem audit log toàn hệ thống (UC-57)",
                "Cấu hình hệ thống & mẫu thông báo (UC-56)",
                "Toàn quyền trên các module nghiệp vụ khác"));
        ROLE_PERMISSIONS.put("MANAGER", List.of(
                "Quản lý dịch vụ, gói dịch vụ, chương trình khuyến mãi",
                "Quản lý lịch hẹn, phân công điều dưỡng",
                "Xem danh sách bệnh nhân"));
        ROLE_PERMISSIONS.put("DOCTOR", List.of(
                "Quản lý lịch hẹn của mình",
                "Xem/cập nhật hồ sơ bệnh nhân"));
        ROLE_PERMISSIONS.put("RECEPTIONIST", List.of(
                "Đăng ký dịch vụ cho bệnh nhân",
                "Quản lý lịch hẹn, checkout",
                "Xem danh sách bệnh nhân"));
        ROLE_PERMISSIONS.put("PHARMACIST", List.of(
                "Quản lý cấp phát thuốc (theo đơn)"));
        ROLE_PERMISSIONS.put("LAB_TECHNICIAN", List.of(
                "Quản lý kết quả xét nghiệm"));
        ROLE_PERMISSIONS.put("NURSE", List.of(
                "Quản lý hàng đợi chăm sóc (care session queue)",
                "Bắt đầu/hoàn thành buổi chăm sóc"));
        ROLE_PERMISSIONS.put("PATIENT", List.of(
                "Đặt lịch hẹn, đăng ký dịch vụ cho bản thân",
                "Xem lịch sử khám, gói dịch vụ của bản thân"));
    }

    private RolePermissionCatalog() {
    }

    public static Map<String, List<String>> all() {
        return ROLE_PERMISSIONS;
    }
}
