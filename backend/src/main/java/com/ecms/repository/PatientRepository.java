// Mạnh Hùng - HE200743
// Repository cung cấp các truy vấn tìm kiếm và kiểm tra dữ liệu bệnh nhân.
// Hỗ trợ tìm theo số điện thoại, email của tài khoản liên kết, và tìm kiếm theo tên/SĐT.
package com.ecms.repository;

import com.ecms.entity.Patient;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;


@Repository
public interface PatientRepository extends JpaRepository<Patient, Long> {

    // Kiểm tra số điện thoại đã có bệnh nhân nào đăng ký chưa
    boolean existsByPhone(String phone);

    // Tìm bệnh nhân theo số điện thoại; dùng khi đăng ký tiếp nhận tại quầy
    Optional<Patient> findByPhone(String phone);

    // Tìm bệnh nhân theo email tài khoản liên kết; dùng khi lấy/cập nhật hồ sơ người dùng
    Optional<Patient> findByUser_Email(String email);

    // Tìm kiếm bệnh nhân theo tên (không phân biệt hoa/thường) hoặc số điện thoại; dùng trong tìm kiếm tại quầy lễ tân
    @Query("SELECT p FROM Patient p WHERE LOWER(p.fullName) LIKE LOWER(CONCAT('%',:keyword,'%')) OR p.phone LIKE CONCAT('%',:keyword,'%')")
    List<Patient> searchByNameOrPhone(@Param("keyword") String keyword);
}
