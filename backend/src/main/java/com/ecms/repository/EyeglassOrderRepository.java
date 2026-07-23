//Author: DucTKH - HE204463
//Created: 2026-06-22
//Last Update: 2026-07-23

package com.ecms.repository;

import com.ecms.entity.EyeglassOrder;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

import java.util.List;

@Repository
public interface EyeglassOrderRepository extends JpaRepository<EyeglassOrder, Long> {
    List<EyeglassOrder> findByPatientIdOrderByCreatedAtDesc(Long patientId);
    List<EyeglassOrder> findByStatus(com.ecms.entity.EyeglassOrderStatus status);
    
    // Kiểm tra xem toa kính đã có đơn đặt kính nào chưa (không tính các đơn đã hủy)
    boolean existsByPrescriptionIdAndStatusNot(Long prescriptionId, com.ecms.entity.EyeglassOrderStatus status);
}
