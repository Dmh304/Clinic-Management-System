/**
 * Triển khai nghiệp vụ UC-55: Manage Room Catalogue & Service Mapping.
 *
 * GHI CHÚ GIẢ ĐỊNH: repository cho ClinicService được giả định tên là
 * `ClinicServiceRepository` (theo convention <EntityName>Repository của dự
 * án). Nếu tên thực tế khác (vd. ServiceRepository), đổi lại import + field
 * bên dưới cho khớp.
 */
package com.ecms.service.impl;

import com.ecms.dto.request.RoomRequest;
import com.ecms.dto.response.RoomResponse;
import com.ecms.entity.ClinicService;
import com.ecms.entity.Room;
import com.ecms.entity.RoomCategory;
import com.ecms.entity.StaffRoomAssignment;
import com.ecms.entity.StaffType;
import com.ecms.repository.ClinicServiceRepository;
import com.ecms.repository.DoctorRepository;
import com.ecms.repository.LabTechnicianRepository;
import com.ecms.repository.RoomRepository;
import com.ecms.repository.StaffRepository;
import com.ecms.repository.StaffRoomAssignmentRepository;
import com.ecms.service.RoomService;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class RoomServiceImpl implements RoomService {

    private final RoomRepository roomRepository;
    private final ClinicServiceRepository clinicServiceRepository;
    private final StaffRoomAssignmentRepository staffRoomAssignmentRepository;
    private final DoctorRepository doctorRepository;
    private final StaffRepository staffRepository;
    private final LabTechnicianRepository labTechnicianRepository;

    @Override
    @Transactional
    public RoomResponse createRoom(RoomRequest request) {
        validateRequest(request, null);

        ClinicService service = resolveService(request.getServiceId());

        Room room = Room.builder()
                .name(request.getName().trim())
                .category(request.getCategory())
                .clinicService(service)
                .capacity(request.getCapacity() != null ? request.getCapacity() : 1)
                .status("ACTIVE")
                .build();

        Room saved = roomRepository.save(room);
        return toResponse(saved);
    }

    @Override
    @Transactional
    public RoomResponse updateRoom(Long roomId, RoomRequest request) {
        Room room = getRoomOrThrow(roomId);
        validateRequest(request, roomId);

        ClinicService service = resolveService(request.getServiceId());

        room.setName(request.getName().trim());
        room.setCategory(request.getCategory());
        room.setClinicService(service);
        if (request.getCapacity() != null) {
            room.setCapacity(request.getCapacity());
        }

        Room saved = roomRepository.save(room);
        return toResponse(saved);
    }

    /**
     * E-1 exception (dùng đúng semantics BR-09 No Hard Delete): phòng không bị
     * xoá vật lý, chỉ chuyển INACTIVE. ALT-1 UC-55.
     */
    @Override
    @Transactional
    public RoomResponse deactivateRoom(Long roomId) {
        Room room = getRoomOrThrow(roomId);
        room.setStatus("INACTIVE");
        return toResponse(roomRepository.save(room));
    }

    @Override
    @Transactional
    public RoomResponse reactivateRoom(Long roomId) {
        Room room = getRoomOrThrow(roomId);
        room.setStatus("ACTIVE");
        return toResponse(roomRepository.save(room));
    }

    @Override
    @Transactional
    public List<RoomResponse> getAllRooms(boolean includeInactive) {
        List<Room> rooms = includeInactive
                ? roomRepository.findAll()
                : roomRepository.findByStatusOrderByCategoryAscNameAsc("ACTIVE");
        return rooms.stream().map(this::toResponse).collect(Collectors.toList());
    }

    @Override
    @Transactional
    public List<RoomResponse> getRoomsByCategory(RoomCategory category) {
        return roomRepository.findByCategoryAndStatusOrderByNameAsc(category, "ACTIVE")
                .stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    @Override
    public List<RoomResponse> getRoomsByService(Long serviceId) {
        return roomRepository.findByClinicService_IdAndStatusOrderByNameAsc(serviceId, "ACTIVE")
                .stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional
    public RoomResponse getRoomById(Long roomId) {
        return toResponse(getRoomOrThrow(roomId));
    }

    // ── Helpers ──────────────────────────────────────────────────────

    private Room getRoomOrThrow(Long roomId) {
        return roomRepository.findById(roomId)
                .orElseThrow(() -> new RuntimeException("Room not found: " + roomId));
    }

    private ClinicService resolveService(Long serviceId) {
        if (serviceId == null)
            return null;
        return clinicServiceRepository.findById(serviceId)
                .orElseThrow(() -> new IllegalArgumentException("Service not found: " + serviceId));
    }

    /**
     * E-1/E-2/E-3 exceptions của UC-55.
     */
    private void validateRequest(RoomRequest request, Long editingRoomId) {
        if (request.getName() == null || request.getName().isBlank()) {
            throw new IllegalArgumentException("Room name is required");
        }
        if (request.getCategory() == null) {
            throw new IllegalArgumentException("Room category is required");
        }
        if (request.getCapacity() != null && request.getCapacity() < 1) {
            throw new IllegalArgumentException("Capacity must be at least 1");
        }

        boolean duplicate = editingRoomId == null
                ? roomRepository.existsByNameIgnoreCaseAndCategory(request.getName().trim(), request.getCategory())
                : roomRepository.existsByNameIgnoreCaseAndCategoryAndIdNot(
                        request.getName().trim(), request.getCategory(), editingRoomId);
        if (duplicate) {
            throw new IllegalStateException(
                    "Duplicate room name within the same category. Please choose a different name.");
        }
    }

    private RoomResponse toResponse(Room room) {
        // Nhân sự đang trực phòng này hôm nay, nếu có — dùng cho danh sách UC-55 bước
        // 2.
        LocalDate today = LocalDate.now();
        String currentStaffName = null;
        String currentStaffType = null;

        List<StaffRoomAssignment> todayAssignments = staffRoomAssignmentRepository
                .findByRoomIdAndEffectiveFromLessThanEqualAndIsOneDayOverrideFalse(
                        room.getId(), today);
        List<StaffRoomAssignment> todayOverrides = staffRoomAssignmentRepository
                .findByRoomIdAndWorkDateAndIsOneDayOverrideTrue(room.getId(), today);

        Optional<StaffRoomAssignment> active = !todayOverrides.isEmpty()
                ? todayOverrides.stream().max((a, b) -> a.getCreatedAt().compareTo(b.getCreatedAt()))
                : todayAssignments.stream().max((a, b) -> a.getEffectiveFrom().compareTo(b.getEffectiveFrom()));

        if (active.isPresent()) {
            StaffRoomAssignment a = active.get();
            currentStaffType = a.getStaffType().name();
            currentStaffName = resolveStaffFullName(a.getStaffType(), a.getStaffId());
        }

        return RoomResponse.builder()
                .id(room.getId())
                .name(room.getName())
                .category(room.getCategory())
                .serviceId(room.getClinicService() != null ? room.getClinicService().getId() : null)
                .serviceName(room.getClinicService() != null ? room.getClinicService().getServiceName() : null)
                .capacity(room.getCapacity())
                .status(room.getStatus())
                .currentStaffFullName(currentStaffName)
                .currentStaffType(currentStaffType)
                .createdAt(room.getCreatedAt())
                .updatedAt(room.getUpdatedAt())
                .build();
    }

    private String resolveStaffFullName(StaffType type, Long staffId) {
        switch (type) {
            case DOCTOR:
                return doctorRepository.findById(staffId).map(d -> d.getFullName()).orElse(null);
            case NURSE:
                return staffRepository.findById(staffId).map(s -> s.getFullName()).orElse(null);
            case LAB_TECHNICIAN:
                return labTechnicianRepository.findById(staffId).map(lt -> lt.getFullName()).orElse(null);
            default:
                return null;
        }
    }
}