// Mạnh Hùng - HE200743
// Entity ánh xạ bảng "users" trong database.
// Lưu trữ thông tin tài khoản người dùng: email, mật khẩu đã mã hóa, họ tên, số điện thoại,
// vai trò (Role), trạng thái (ACTIVE/INACTIVE) và thời điểm tạo tài khoản.
package com.ecms.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "users")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(unique = true, nullable = false)
    private String email;

    // Có thể NULL: tài khoản đăng nhập bằng Google chưa từng đặt mật khẩu
    @Column(name = "password")
    private String passwordHash;

    @Column(name = "full_name", nullable = false)
    private String fullName;

    @Column(name = "phone_number")
    private String phone;

    // Phòng/bộ phận công tác — chỉ áp dụng cho tài khoản nhân viên (UC-55), null với PATIENT
    @Column(name = "department")
    private String department;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "role_id", nullable = false)
    private Role role;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    @Builder.Default
    private UserStatus status = UserStatus.ACTIVE;

    @Enumerated(EnumType.STRING)
    @Column(name = "auth_provider", nullable = false, length = 20)
    @Builder.Default
    private AuthProvider authProvider = AuthProvider.LOCAL;

    @Column(name = "failed_login_attempts", nullable = false)
    @Builder.Default
    private int failedLoginAttempts = 0;

    @Column(name = "lock_until")
    private LocalDateTime lockUntil;

    // Tăng lên mỗi lần admin deactivate tài khoản (UC-55) — JwtAuthFilter so sánh giá trị này
    // với claim trong token để vô hiệu hoá các JWT đã cấp trước đó (JWT vốn stateless, không có session).
    @Column(name = "token_version", nullable = false)
    @Builder.Default
    private int tokenVersion = 0;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    // Soft delete (UC-55): tài khoản nhân viên đã DISABLED có thể bị admin "xóa" khỏi danh sách —
    // chỉ ẩn đi (deletedAt khác NULL), không xóa cứng bản ghi để giữ liên kết với appointment/
    // prescription/audit log cũ (BR-09).
    @Column(name = "deleted_at")
    private LocalDateTime deletedAt;
}
