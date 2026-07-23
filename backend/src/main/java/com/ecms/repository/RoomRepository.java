package com.ecms.repository;

import com.ecms.entity.Room;
import com.ecms.entity.RoomCategory;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface RoomRepository extends JpaRepository<Room, Long> {

    List<Room> findByStatusOrderByCategoryAscNameAsc(String status);

    List<Room> findByCategoryAndStatusOrderByNameAsc(RoomCategory category, String status);

    // Phòng đang phục vụ 1 dịch vụ/loại xét nghiệm cụ thể — dùng để resolve phòng lúc
    // đặt lịch (UC-11/UC-19/UC-29).
    List<Room> findByClinicService_IdAndStatusOrderByNameAsc(Long serviceId, String status);

    boolean existsByNameIgnoreCaseAndCategory(String name, RoomCategory category);

    // Dùng khi edit — loại trừ chính bản ghi đang sửa khỏi kiểm tra trùng tên
    boolean existsByNameIgnoreCaseAndCategoryAndIdNot(String name, RoomCategory category, Long id);
}