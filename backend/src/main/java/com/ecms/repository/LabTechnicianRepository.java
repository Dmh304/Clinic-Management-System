/**
 * Author: TuanTD
 * 
 * Kho lưu trữ dữ liệu (Repository) cho thực thể LabTechnician
 * Cung cấp các phương thức truy vấn và quản lý thông tin của các kỹ thuật viên phòng xét nghiệm trong cơ sở dữ liệu
 */

package com.ecms.repository;

import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import com.ecms.entity.LabTechnician;

public interface LabTechnicianRepository extends JpaRepository<LabTechnician, Long> {

    /**
     * Tìm kiếm thông tin kỹ thuật viên dựa trên địa chỉ email.
     */
    Optional<LabTechnician> findByEmail(String email);

    /**
     * Tìm kiếm danh sách các kỹ thuật viên theo trạng thái làm việc
     */
    List<LabTechnician> findByStatus(String status);
}