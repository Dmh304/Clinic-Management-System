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

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "role_id", nullable = false)
    private Role role;

    @Column(nullable = false)
    @Builder.Default
    private String status = "ACTIVE";

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;
}
