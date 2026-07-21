package com.ecms.repository;

import com.ecms.entity.Room;
import com.ecms.entity.RoomCategory;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface RoomRepository extends JpaRepository<Room, Long> {

    List<Room> findByStatusOrderByCategoryAscNameAsc(String status);

    List<Room> findByCategoryAndStatusOrderByNameAsc(RoomCategory category, String status);

    boolean existsByNameIgnoreCaseAndCategory(String name, RoomCategory category);

    // Dùng khi edit — loại trừ chính bản ghi đang sửa khỏi kiểm tra trùng tên
    boolean existsByNameIgnoreCaseAndCategoryAndIdNot(String name, RoomCategory category, Long id);
}