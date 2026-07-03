/**
 * Author: TuanTD
 * 
 * Kho lưu trữ dữ liệu (Repository) cho thực thể LabOrder
 * Cung cấp các phương thức truy vấn dữ liệu từ bảng "lab_orders" trong cơ sở dữ liệu
 */

package com.ecms.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.ecms.entity.LabOrder;
import com.ecms.entity.LabOrderStatus;

import java.util.List;

public interface LabOrderRepository extends JpaRepository<LabOrder, Long> {

    /**
     * Tìm kiếm danh sách các đơn xét nghiệm dựa trên ID của bệnh nhân (thông qua hồ
     * sơ bệnh án)
     * Kết quả trả về được sắp xếp theo thời gian tạo giảm dần (Mới nhất xếp trước)
     */
    List<LabOrder> findByMedicalRecord_PatientIdOrderByCreatedAt(Long patientId);

    /**
     * Tìm kiếm danh sách các đơn xét nghiệm dựa trên ID của bác sĩ chịu trách nhiệm
     * trong hồ sơ bệnh án
     * Kết quả trả về được sắp xếp theo thời gian tạo giảm dần (Mới nhất xếp trước)
     */
    List<LabOrder> findByMedicalRecord_DoctorIdOrderByCreatedAt(Long doctorId);

    /**
     * Tìm kiếm danh sách các đơn xét nghiệm do một bác sĩ trực tiếp chỉ định/tạo ra
     * Kết quả trả về được sắp xếp theo thời gian tạo giảm dần (Mới nhất xếp trước)
     */
    List<LabOrder> findByDoctorIdOrderByCreatedAt(Long doctorId);

    /**
     * Tìm kiếm danh sách các đơn xét nghiệm thuộc về một hồ sơ bệnh án cụ thể
     * Kết quả trả về được sắp xếp theo thời gian tạo giảm dần (Mới nhất xếp trước)
     */
    List<LabOrder> findByMedicalRecordIdOrderByCreatedAt(Long medicalRecordId);

    /**
     * Tìm kiếm danh sách các đơn xét nghiệm được phân công cho một kỹ thuật viên cụ
     * thể thực hiện
     * Kết quả trả về được sắp xếp theo thời gian tạo giảm dần (Mới nhất xếp trước)
     */
    List<LabOrder> findByLabTechnicianIdOrderByCreatedAt(Long labTechnicianId);

    boolean existsByMedicalRecordIdAndStatusIn(Long medicalRecordId, List<LabOrderStatus> statuses);

    /**
     * Tìm danh sách phiếu xét nghiệm do bác sĩ chỉ định,
     * sắp xếp theo mức độ ưu tiên (EMERGENCY > WARNING > PRIMARY),
     * sau đó theo thời gian tạo tăng dần (cũ trước, mới sau) trong cùng mức ưu
     * tiên.
     */
    @Query("SELECT lo FROM LabOrder lo " +
            "WHERE lo.doctor.id = :doctorId " +
            "ORDER BY " +
            "CASE lo.priority " +
            "  WHEN com.ecms.entity.LabPriority.EMERGENCY THEN 0 " +
            "  WHEN com.ecms.entity.LabPriority.WARNING THEN 1 " +
            "  WHEN com.ecms.entity.LabPriority.PRIMARY THEN 2 " +
            "  ELSE 99 END ASC, " +
            "lo.createdAt ASC")
    List<LabOrder> findByDoctorIdOrderByPriorityAndCreatedAt(@Param("doctorId") Long doctorId);

    /**
     * Tìm danh sách phiếu xét nghiệm do bác sĩ chỉ định,
     * sắp xếp theo mức độ ưu tiên (EMERGENCY > WARNING > PRIMARY),
     * sau đó theo thời gian tạo tăng dần (cũ trước, mới sau) trong cùng mức ưu
     * tiên.
     */
    @Query("SELECT lo FROM LabOrder lo " +
            "WHERE lo.labTechnician.id = :labTechnicianId " +
            "ORDER BY " +
            "CASE lo.priority " +
            "  WHEN com.ecms.entity.LabPriority.EMERGENCY THEN 0 " +
            "  WHEN com.ecms.entity.LabPriority.WARNING THEN 1 " +
            "  WHEN com.ecms.entity.LabPriority.PRIMARY THEN 2 " +
            "  ELSE 99 END ASC, " +
            "lo.createdAt ASC")
    List<LabOrder> findByLabTechnicianIdOrderByPriorityAndCreatedAt(@Param("labTechnicianId") Long labTechnicianId);

}