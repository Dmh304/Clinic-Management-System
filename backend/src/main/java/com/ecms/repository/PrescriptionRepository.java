//Author: DucTKH - HE204463
//Created: 2026-06-01
//Last Update: 2026-07-21
// Repository cho Entity Prescription, truy vấn dữ liệu đơn thuốc.
package com.ecms.repository;

import com.ecms.entity.Prescription;
import com.ecms.entity.PrescriptionStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface PrescriptionRepository extends JpaRepository<Prescription, Long> {
    // Lấy danh sách đơn thuốc của một bệnh nhân, sắp xếp mới nhất lên đầu
    List<Prescription> findByPatientIdOrderByCreatedAtDesc(Long patientId);
    
    // Lấy danh sách đơn thuốc theo trạng thái (ví dụ: PENDING để dược sĩ phát thuốc)
    List<Prescription> findByStatusOrderByCreatedAtAsc(PrescriptionStatus status);

    // Lấy danh sách đơn thuốc theo hồ sơ bệnh án
    List<Prescription> findByMedicalRecordId(Long medicalRecordId);

    // UC-49: đếm đơn thuốc theo trạng thái (vd PENDING) cho dashboard vận hành
    long countByStatus(PrescriptionStatus status);

    // UC-52: đơn thuốc tạo trong khoảng thời gian — tính số đơn theo bác sĩ
    List<Prescription> findByCreatedAtBetween(LocalDateTime from, LocalDateTime to);
}
