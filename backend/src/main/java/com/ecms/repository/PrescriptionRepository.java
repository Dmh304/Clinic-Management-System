// DucTKH
// Repository cho Entity Prescription, truy vấn dữ liệu đơn thuốc.
package com.ecms.repository;

import com.ecms.entity.Prescription;
import com.ecms.entity.PrescriptionStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface PrescriptionRepository extends JpaRepository<Prescription, Long> {
    // Lấy danh sách đơn thuốc của một bệnh nhân, sắp xếp mới nhất lên đầu
    List<Prescription> findByPatientIdOrderByCreatedAtDesc(Long patientId);
    
    // Lấy danh sách đơn thuốc theo trạng thái (ví dụ: PENDING để dược sĩ phát thuốc)
    List<Prescription> findByStatusOrderByCreatedAtAsc(PrescriptionStatus status);
}
