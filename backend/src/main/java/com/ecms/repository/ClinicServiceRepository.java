// Mạnh Hùng - HE200743
// Repository cung cấp các thao tác CRUD cho danh sách dịch vụ khám chữa bệnh của phòng khám.
// Kế thừa toàn bộ các phương thức từ JpaRepository (findAll, save, deleteById, v.v.).
package com.ecms.repository;

import com.ecms.entity.ClinicService;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface ClinicServiceRepository extends JpaRepository<ClinicService, Long> {
}