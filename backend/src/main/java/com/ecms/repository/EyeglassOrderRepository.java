//Author: DucTKH - HE204463
//Created: 2026-06-22
//Last Update: 2026-07-23

package com.ecms.repository;

import com.ecms.entity.EyeglassOrder;
import com.ecms.entity.EyeglassOrderStatus;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface EyeglassOrderRepository extends JpaRepository<EyeglassOrder, Long> {
    List<EyeglassOrder> findByPatientIdOrderByCreatedAtDesc(Long patientId);

    List<EyeglassOrder> findByStatus(com.ecms.entity.EyeglassOrderStatus status);

    // Hàng đợi gia công của Lab Technician: PENDING_LAB, IN_PRODUCTION, READY
    List<EyeglassOrder> findByStatusInOrderByCreatedAtAsc(List<EyeglassOrderStatus> statuses);

    // Kiểm tra xem toa kính đã có đơn đặt kính nào chưa (không tính các đơn đã hủy)
    boolean existsByPrescriptionIdAndStatusNot(Long prescriptionId, EyeglassOrderStatus status);
    
    // Lấy danh sách đơn đặt kính theo id toa kính
    List<EyeglassOrder> findByPrescriptionId(Long prescriptionId);
    
    // Lấy tất cả đơn đặt kính sắp xếp mới nhất lên đầu
    List<EyeglassOrder> findAllByOrderByCreatedAtDesc();
}
