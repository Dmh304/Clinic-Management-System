// Le Thi Bich Ngan - HE204710
// Repository truy cập dữ liệu bảng patients.
// Cung cấp các query: kiểm tra trùng số điện thoại, tìm theo email liên kết tài khoản,
// và tìm kiếm bệnh nhân theo tên hoặc số điện thoại.

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

    // Kiểm tra số điện thoại đã tồn tại trong DB chưa (dùng để validate trùng khi đăng ký)
    boolean existsByPhone(String phone);

    // Tìm bệnh nhân theo số điện thoại
    Optional<Patient> findByPhone(String phone);

    // Tìm bệnh nhân theo email của tài khoản User liên kết (dùng khi bệnh nhân đặt lịch online)
    Optional<Patient> findByUser_Email(String email);

    // Tìm kiếm bệnh nhân theo tên (không phân biệt hoa/thường) hoặc số điện thoại
    @Query("SELECT p FROM Patient p WHERE LOWER(p.fullName) LIKE LOWER(CONCAT('%',:keyword,'%')) OR p.phone LIKE CONCAT('%',:keyword,'%')")
    List<Patient> searchByNameOrPhone(@Param("keyword") String keyword);
}
