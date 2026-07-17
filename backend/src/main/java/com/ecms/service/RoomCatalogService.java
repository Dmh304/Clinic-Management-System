// UC-58: Manage Room Catalogue & Service Mapping
package com.ecms.service;

import com.ecms.dto.request.RoomRequest;
import com.ecms.dto.response.RoomResponse;

import java.util.List;

public interface RoomCatalogService {

    RoomResponse create(RoomRequest request, String actorEmail, String ipAddress);

    RoomResponse update(Long id, RoomRequest request, String actorEmail, String ipAddress);

    /** ALT-1: vô hiệu hoá phòng (BR-09 — không xoá cứng). */
    void deactivate(Long id, String actorEmail, String ipAddress);

    RoomResponse getById(Long id);

    List<RoomResponse> getAll();

    List<RoomResponse> getActiveByType(String roomType);

    /** UC-59/UC-11/UC-19/UC-29: các phòng đang active phục vụ 1 dịch vụ/loại xét nghiệm cụ thể. */
    List<RoomResponse> getActiveByService(Long serviceId);
}
