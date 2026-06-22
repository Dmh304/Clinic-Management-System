// Le Thi Bich Ngan - HE204710
// Repository truy cập dữ liệu bảng patients.
// Cung cấp các query: kiểm tra trùng số điện thoại/CCCD, tìm theo email liên kết tài khoản,
// và tìm kiếm bệnh nhân theo tên, số điện thoại hoặc CCCD.

package com.ecms.repository;

import com.ecms.entity.Doctor;
import com.ecms.entity.Patient;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Repository
public interface PatientRepository extends JpaRepository<Patient, Long> {

    // Kiểm tra số điện thoại đã tồn tại trong DB chưa (dùng để validate trùng khi
    // đăng ký)
    boolean existsByPhone(String phone);

    // Tìm bệnh nhân theo số điện thoại
    Optional<Patient> findByPhone(String phone);

    Optional<Patient> findByEmail(String email);

    // Tìm kiếm bệnh nhân theo tên (không phân biệt hoa/thường) hoặc số điện thoại;
    // dùng trong tìm kiếm tại quầy lễ tân
    @Query("SELECT p FROM Patient p WHERE LOWER(p.fullName) LIKE LOWER(CONCAT('%',:keyword,'%')) OR p.phone LIKE CONCAT('%',:keyword,'%')")
    List<Patient> searchByNameOrPhone(@Param("keyword") String keyword);

    // Tìm bệnh nhân theo email của tài khoản User liên kết (dùng khi bệnh nhân đặt
    // lịch online)
    Optional<Patient> findByUser_Email(String email);

    // Kiểm tra CCCD đã tồn tại trong DB chưa (CCCD là định danh chính, không cho
    // trùng)
    boolean existsByCccd(String cccd);

    // Tìm bệnh nhân theo CCCD
    Optional<Patient> findByCccd(String cccd);

    // Tìm bệnh nhân trùng tên + ngày sinh (dùng để phát hiện trùng hồ sơ trẻ em
    // không có CCCD)
    List<Patient> findByFullNameIgnoreCaseAndDateOfBirth(String fullName, LocalDate dateOfBirth);

    // Tìm kiếm bệnh nhân theo tên (không phân biệt hoa/thường), số điện thoại hoặc
    // CCCD
    @Query("SELECT p FROM Patient p WHERE " +
            "LOWER(p.fullName) LIKE LOWER(CONCAT('%',:keyword,'%')) OR " +
            "p.phone LIKE CONCAT('%',:keyword,'%') OR " +
            "p.cccd LIKE CONCAT('%',:keyword,'%')")
    List<Patient> searchByNameOrPhoneOrCccd(@Param("keyword") String keyword);

}
