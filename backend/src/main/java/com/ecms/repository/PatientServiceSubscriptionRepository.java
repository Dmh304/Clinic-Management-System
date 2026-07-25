package com.ecms.repository;

import com.ecms.entity.PatientServiceSubscription;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface PatientServiceSubscriptionRepository extends JpaRepository<PatientServiceSubscription, Long> {

    List<PatientServiceSubscription> findByPatient_User_EmailOrderByCreatedAtDesc(String email);

    List<PatientServiceSubscription> findByPatient_IdAndStatusOrderByCreatedAtDesc(Long patientId, String status);

    List<PatientServiceSubscription> findByPatient_IdOrderByCreatedAtDesc(Long patientId);

    @Query("SELECT s FROM PatientServiceSubscription s WHERE s.patient.id = :patientId AND s.service.id = :serviceId AND s.status = 'ACTIVE'")
    List<PatientServiceSubscription> findActiveByPatientAndService(@Param("patientId") Long patientId, @Param("serviceId") Long serviceId);

    List<PatientServiceSubscription> findAllByOrderByCreatedAtDesc();

    // Bệnh nhân đã từng mua dịch vụ này chưa (bất kỳ trạng thái) — dùng để miễn bước
    // tư vấn cho lần mua LẶP LẠI, chỉ bắt buộc tư vấn ở lần mua ĐẦU TIÊN.
    boolean existsByPatient_IdAndService_Id(Long patientId, Long serviceId);

    // Đếm số người đăng ký (subscription) của một gói dịch vụ — phục vụ cột "Người đăng ký" ở màn Quản lý gói dịch vụ
    long countByService_Id(Long serviceId);
}
