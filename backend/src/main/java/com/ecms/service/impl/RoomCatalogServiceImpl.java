package com.ecms.service.impl;

import com.ecms.dto.request.RoomRequest;
import com.ecms.dto.response.RoomResponse;
import com.ecms.entity.ClinicService;
import com.ecms.entity.Room;
import com.ecms.entity.RoomService;
import com.ecms.exception.ResourceNotFoundException;
import com.ecms.repository.ClinicServiceRepository;
import com.ecms.repository.RoomRepository;
import com.ecms.repository.RoomServiceRepository;
import com.ecms.repository.UserRepository;
import com.ecms.service.AuditLogService;
import com.ecms.service.RoomCatalogService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class RoomCatalogServiceImpl implements RoomCatalogService {

    private final RoomRepository roomRepository;
    private final RoomServiceRepository roomServiceRepository;
    private final ClinicServiceRepository clinicServiceRepository;
    private final UserRepository userRepository;
    private final AuditLogService auditLogService;

    @Override
    @Transactional
    public RoomResponse create(RoomRequest request, String actorEmail, String ipAddress) {
        // E-2: tên phòng không trùng trong cùng loại phòng.
        if (roomRepository.existsByNameAndRoomType(request.getName(), request.getRoomType())) {
            throw new IllegalArgumentException("Đã tồn tại phòng cùng tên trong loại phòng này");
        }
        List<ClinicService> services = resolveServices(request.getServiceIds());

        Room room = Room.builder()
                .name(request.getName())
                .roomType(request.getRoomType())
                .capacity(request.getCapacity() != null ? request.getCapacity() : 1)
                .isActive(request.getIsActive() != null ? request.getIsActive() : true)
                .build();
        Room saved = roomRepository.save(room);

        saveMappings(saved, services);

        auditLogService.log(resolveActorId(actorEmail), "CREATE_ROOM", "Room",
                String.valueOf(saved.getId()), null, snapshot(saved, services), ipAddress);

        return toResponse(saved, services);
    }

    @Override
    @Transactional
    public RoomResponse update(Long id, RoomRequest request, String actorEmail, String ipAddress) {
        Room room = getOrThrow(id);
        if (!room.getName().equals(request.getName()) || !room.getRoomType().equals(request.getRoomType())) {
            if (roomRepository.existsByNameAndRoomType(request.getName(), request.getRoomType())) {
                throw new IllegalArgumentException("Đã tồn tại phòng cùng tên trong loại phòng này");
            }
        }
        List<ClinicService> oldServices = mappedServices(room.getId());
        Map<String, Object> oldValue = snapshot(room, oldServices);

        List<ClinicService> services = resolveServices(request.getServiceIds());

        room.setName(request.getName());
        room.setRoomType(request.getRoomType());
        room.setCapacity(request.getCapacity() != null ? request.getCapacity() : 1);
        if (request.getIsActive() != null) room.setIsActive(request.getIsActive());
        Room saved = roomRepository.save(room);

        // Thay toàn bộ mapping dịch vụ theo lựa chọn mới.
        roomServiceRepository.deleteAll(roomServiceRepository.findByRoom_Id(saved.getId()));
        saveMappings(saved, services);

        auditLogService.log(resolveActorId(actorEmail), "EDIT_ROOM", "Room",
                String.valueOf(saved.getId()), oldValue, snapshot(saved, services), ipAddress);

        return toResponse(saved, services);
    }

    @Override
    @Transactional
    public void deactivate(Long id, String actorEmail, String ipAddress) {
        Room room = getOrThrow(id);
        Map<String, Object> oldValue = snapshot(room, mappedServices(room.getId()));
        room.setIsActive(false);
        Room saved = roomRepository.save(room);

        auditLogService.log(resolveActorId(actorEmail), "DEACTIVATE_ROOM", "Room",
                String.valueOf(saved.getId()), oldValue, snapshot(saved, mappedServices(saved.getId())), ipAddress);
    }

    @Override
    public RoomResponse getById(Long id) {
        Room room = getOrThrow(id);
        return toResponse(room, mappedServices(room.getId()));
    }

    @Override
    public List<RoomResponse> getAll() {
        return roomRepository.findAllByOrderByRoomTypeAscNameAsc().stream()
                .map(room -> toResponse(room, mappedServices(room.getId())))
                .collect(Collectors.toList());
    }

    @Override
    public List<RoomResponse> getActiveByType(String roomType) {
        return roomRepository.findByRoomTypeAndIsActiveTrueOrderByNameAsc(roomType).stream()
                .map(room -> toResponse(room, mappedServices(room.getId())))
                .collect(Collectors.toList());
    }

    @Override
    public List<RoomResponse> getActiveByService(Long serviceId) {
        return roomServiceRepository.findByService_IdAndRoom_IsActiveTrue(serviceId).stream()
                .map(RoomService::getRoom)
                .map(room -> toResponse(room, mappedServices(room.getId())))
                .collect(Collectors.toList());
    }

    // ── Helpers ──────────────────────────────────────────────────────────

    private List<ClinicService> resolveServices(List<Long> serviceIds) {
        List<ClinicService> services = clinicServiceRepository.findAllById(serviceIds);
        if (services.size() != serviceIds.size()) {
            throw new ResourceNotFoundException("Một hoặc nhiều dịch vụ được chọn không tồn tại");
        }
        return services;
    }

    private void saveMappings(Room room, List<ClinicService> services) {
        for (ClinicService service : services) {
            roomServiceRepository.save(RoomService.builder().room(room).service(service).build());
        }
    }

    private List<ClinicService> mappedServices(Long roomId) {
        return roomServiceRepository.findByRoom_Id(roomId).stream()
                .map(RoomService::getService)
                .collect(Collectors.toList());
    }

    private Long resolveActorId(String actorEmail) {
        if (actorEmail == null) return null;
        return userRepository.findByEmail(actorEmail).map(u -> u.getId()).orElse(null);
    }

    private Map<String, Object> snapshot(Room room, List<ClinicService> services) {
        Map<String, Object> map = new HashMap<>();
        map.put("name", room.getName());
        map.put("roomType", room.getRoomType());
        map.put("capacity", room.getCapacity());
        map.put("isActive", room.getIsActive());
        map.put("serviceIds", services.stream().map(ClinicService::getId).collect(Collectors.toList()));
        return map;
    }

    private Room getOrThrow(Long id) {
        return roomRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy phòng"));
    }

    private RoomResponse toResponse(Room room, List<ClinicService> services) {
        return RoomResponse.builder()
                .id(room.getId())
                .name(room.getName())
                .roomType(room.getRoomType())
                .capacity(room.getCapacity())
                .isActive(room.getIsActive())
                .services(services.stream()
                        .map(s -> RoomResponse.ServiceOption.builder()
                                .id(s.getId())
                                .serviceName(s.getServiceName())
                                .build())
                        .collect(Collectors.toList()))
                .createdAt(room.getCreatedAt())
                .updatedAt(room.getUpdatedAt())
                .build();
    }
}
