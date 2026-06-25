package com.ecms.repository;

import com.ecms.entity.ServiceRegistration;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ServiceRegistrationRepository extends JpaRepository<ServiceRegistration, Long> {
    List<ServiceRegistration> findByPatient_User_EmailOrderByCreatedAtDesc(String email);
    List<ServiceRegistration> findAllByOrderByCreatedAtDesc();

    // Kiểm tra bệnh nhân đã có đăng ký cho dịch vụ này ở trạng thái nhất định chưa
    // (dùng để chặn đăng ký trùng khi đang chờ tư vấn — status = PENDING)
    boolean existsByPatient_IdAndService_IdAndStatus(Long patientId, Long serviceId, String status);
}
