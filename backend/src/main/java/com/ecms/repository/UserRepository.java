// Mạnh Hùng - HE200743
// Repository cung cấp các truy vấn CRUD và tìm kiếm người dùng theo email.
// Dùng trong xác thực đăng nhập, đăng ký và quản lý hồ sơ.
package com.ecms.repository;

import com.ecms.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<User, Long> {
    // Tìm người dùng theo email; dùng trong đăng nhập và lấy thông tin hồ sơ
    Optional<User> findByEmail(String email);

    // Kiểm tra email đã tồn tại trong hệ thống chưa; dùng khi đăng ký để tránh trùng lặp
    boolean existsByEmail(String email);
    List<User> findByRole_Name(String roleName);
}
