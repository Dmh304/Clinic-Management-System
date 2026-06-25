/**
 * Author: TuanTD
 * 
 * Kho lưu trữ dữ liệu (Repository) cho thực thể LabOrder
 * Cung cấp các phương thức truy vấn dữ liệu từ bảng "lab_orders" trong cơ sở dữ liệu
 */

package com.ecms.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import com.ecms.entity.LabOrder;
import java.util.List;

public interface LabOrderRepository extends JpaRepository<LabOrder, Long> {

    /**
     * Tìm kiếm danh sách các đơn xét nghiệm dựa trên ID của bệnh nhân (thông qua hồ
     * sơ bệnh án)
     * Kết quả trả về được sắp xếp theo thời gian tạo giảm dần (Mới nhất xếp trước)
     */
    List<LabOrder> findByMedicalRecord_PatientIdOrderByCreatedAtDesc(Long patientId);

    /**
     * Tìm kiếm danh sách các đơn xét nghiệm dựa trên ID của bác sĩ chịu trách nhiệm
     * trong hồ sơ bệnh án
     * Kết quả trả về được sắp xếp theo thời gian tạo giảm dần (Mới nhất xếp trước)
     */
    List<LabOrder> findByMedicalRecord_DoctorIdOrderByCreatedAtDesc(Long doctorId);

    /**
     * Tìm kiếm danh sách các đơn xét nghiệm do một bác sĩ trực tiếp chỉ định/tạo ra
     * Kết quả trả về được sắp xếp theo thời gian tạo giảm dần (Mới nhất xếp trước)
     */
    List<LabOrder> findByDoctorIdOrderByCreatedAtDesc(Long doctorId);

    /**
     * Tìm kiếm danh sách các đơn xét nghiệm thuộc về một hồ sơ bệnh án cụ thể
     * Kết quả trả về được sắp xếp theo thời gian tạo giảm dần (Mới nhất xếp trước)
     */
    List<LabOrder> findByMedicalRecordIdOrderByCreatedAtDesc(Long medicalRecordId);

    /**
     * Tìm kiếm danh sách các đơn xét nghiệm được phân công cho một kỹ thuật viên cụ
     * thể thực hiện
     * Kết quả trả về được sắp xếp theo thời gian tạo giảm dần (Mới nhất xếp trước)
     */
    List<LabOrder> findByLabTechnicianIdOrderByCreatedAtDesc(Long labTechnicianId);
}