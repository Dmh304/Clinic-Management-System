// Mạnh Hùng - HE200743
// Repository cung cấp các thao tác CRUD cho danh sách dịch vụ khám chữa bệnh của phòng khám.
// Kế thừa toàn bộ các phương thức từ JpaRepository (findAll, save, deleteById, v.v.).
package com.ecms.repository;

import com.ecms.entity.ClinicService;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ClinicServiceRepository extends JpaRepository<ClinicService, Long> {
    List<ClinicService> findByIsActiveTrueOrderByDisplayOrderAsc();
    List<ClinicService> findByCategory_IdAndIsActiveTrueOrderByDisplayOrderAsc(Long categoryId);
    List<ClinicService> findByServiceTypeAndIsActiveTrueOrderByDisplayOrderAsc(String serviceType);
}
