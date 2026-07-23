package com.ecms.service;

import com.ecms.dto.request.RoomRequest;
import com.ecms.dto.response.RoomResponse;
import com.ecms.entity.RoomCategory;

import java.util.List;

public interface RoomService {

    RoomResponse createRoom(RoomRequest request);

    RoomResponse updateRoom(Long roomId, RoomRequest request);

    RoomResponse deactivateRoom(Long roomId);

    RoomResponse reactivateRoom(Long roomId);

    List<RoomResponse> getAllRooms(boolean includeInactive);

    List<RoomResponse> getRoomsByCategory(RoomCategory category);

    /** UC-11/UC-19/UC-29: các phòng đang active phục vụ 1 dịch vụ/loại xét nghiệm cụ thể. */
    List<RoomResponse> getRoomsByService(Long serviceId);

    RoomResponse getRoomById(Long roomId);
}