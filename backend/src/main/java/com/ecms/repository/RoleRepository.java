// Mạnh Hùng - HE200743
// Repository cung cấp truy vấn tìm kiếm vai trò theo tên.
// Dùng khi đăng ký tài khoản để gán vai trò PATIENT cho người dùng mới.
package com.ecms.repository;

import com.ecms.entity.Role;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface RoleRepository extends JpaRepository<Role, Long> {
    // Tìm vai trò theo tên (ví dụ: "PATIENT", "DOCTOR"); dùng khi tạo tài khoản mới
    Optional<Role> findByName(String name);
}
