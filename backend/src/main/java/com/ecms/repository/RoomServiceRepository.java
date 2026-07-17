package com.ecms.repository;

import com.ecms.entity.RoomService;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface RoomServiceRepository extends JpaRepository<RoomService, Long> {

    /** UC-11/UC-19/UC-29: các phòng khả dụng (còn active) phục vụ 1 dịch vụ/loại xét nghiệm. */
    List<RoomService> findByService_IdAndRoom_IsActiveTrue(Long serviceId);

    List<RoomService> findByRoom_Id(Long roomId);

    boolean existsByRoom_IdAndService_Id(Long roomId, Long serviceId);
}
