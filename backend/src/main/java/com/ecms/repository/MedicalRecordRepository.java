/**
 * Author: TuanTD
 * 
 * Kho lưu trữ dữ liệu Hồ sơ bệnh án (Medical Record Repository)
 * Giao tiếp trực tiếp với cơ sở dữ liệu để thực hiện các thao tác CRUD và truy
 * vấn nâng cao liên quan đến thực thể MedicalRecord (Hồ sơ khám bệnh của bệnh nhân)
 */

package com.ecms.repository;

import com.ecms.entity.MedicalRecord;
import com.ecms.entity.MedicalRecordStatus;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface MedicalRecordRepository extends JpaRepository<MedicalRecord, Long> {

    /* Tìm kiếm hồ sơ bệnh án dựa vào mã lịch hẹn (Appointment ID) */
    Optional<MedicalRecord> findByAppointmentId(Long appointmentId);

    /*
     * Truy vấn danh sách hồ sơ bệnh án của một bệnh nhân cụ thể, sắp xếp theo thời
     * gian tạo giảm dần (Mới nhất lên đầu)
     */
    @Query("""
                SELECT m FROM MedicalRecord m
                LEFT JOIN FETCH m.appointment a
                LEFT JOIN FETCH m.doctor d
                WHERE m.patient.id = :patientId
                ORDER BY m.createdAt DESC
            """)
    List<MedicalRecord> findByPatientIdOrderByCreatedAtDesc(@Param("patientId") Long patientId);

    /* Tìm danh sách hồ sơ bệnh án dựa theo trạng thái hồ sơ */
    List<MedicalRecord> findByStatusOrderByCreatedAtDesc(MedicalRecordStatus status);

    /*
     * Tìm danh sách hồ sơ bệnh án dựa theo trạng thái và được phụ trách bởi một bác
     * sĩ cụ thể
     */
    List<MedicalRecord> findByStatusAndDoctorIdOrderByCreatedAtDesc(MedicalRecordStatus status, Long doctorId);

    /* Tìm kiếm hồ sơ bệnh án theo mã định danh (ID) của chính hồ sơ đó */
    Optional<MedicalRecord> findById(Long id);

    /* Lấy toàn bộ danh sách hồ sơ bệnh án có trong hệ thống phòng khám trước */
    List<MedicalRecord> findAllByOrderByCreatedAtDesc();

}