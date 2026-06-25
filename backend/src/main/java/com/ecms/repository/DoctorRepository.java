/**
 * Author: TuanTD
 * 
 * Kho lưu trữ dữ liệu Bác sĩ (Doctor Repository)
 * Cung cấp các phương thức CRUD cơ bản và các truy vấn tùy biến để tương tác với bảng chứa thông tin Bác sĩ (Doctor) trong Cơ sở dữ liệu
 */

package com.ecms.repository;

import com.ecms.entity.Doctor;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface DoctorRepository extends JpaRepository<Doctor, Long> {

    /* Tìm kiếm thông tin bác sĩ dựa trên địa chỉ Email */
    Optional<Doctor> findByEmail(String email);

    /*
     * Tìm kiếm thông tin bác sĩ thông qua mã định danh tài khoản người dùng (User
     * ID)
     */
    Optional<Doctor> findByUserId(Long userId);
}