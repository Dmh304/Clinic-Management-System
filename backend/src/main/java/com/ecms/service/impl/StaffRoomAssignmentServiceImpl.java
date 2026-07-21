/**
 * Triển khai nghiệp vụ UC-56: Manage Staff Room Roster.
 *
 * Đây là phần lõi hiện thực hoá BR-24: một khi nhân sự được phân trực phòng,
 * MỌI appointment/lab order/care session gắn với nhân sự đó trong ngày đó tự
 * động lấy phòng từ assignment này — Patient/Receptionist không bao giờ tự
 * chọn phòng.
 *
 * GHI CHÚ GIẢ ĐỊNH: dùng `StaffRepository` (bảng staffs) để validate Nurse —
 * lọc theo `position = "NURSE"`. Nếu Nurse có repository/entity riêng trong
 * dự án thực tế, đổi `validateNurseExists` cho khớp.
 */
package com.ecms.service.impl;

import com.ecms.dto.request.StaffRoomAssignmentRequest;
import com.ecms.dto.response.RoomResolutionResponse;
import com.ecms.dto.response.StaffRoomAssignmentResponse;
import com.ecms.entity.Room;
import com.ecms.entity.RoomCategory;
import com.ecms.entity.StaffRoomAssignment;
import com.ecms.entity.StaffType;
import com.ecms.repository.DoctorRepository;
import com.ecms.repository.LabTechnicianRepository;
import com.ecms.repository.RoomRepository;
import com.ecms.repository.StaffRepository;
import com.ecms.repository.StaffRoomAssignmentRepository;
import com.ecms.service.StaffRoomAssignmentService;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class StaffRoomAssignmentServiceImpl implements StaffRoomAssignmentService {

    private final StaffRoomAssignmentRepository assignmentRepository;
    private final RoomRepository roomRepository;
    private final DoctorRepository doctorRepository;
    private final StaffRepository staffRepository;
    private final LabTechnicianRepository labTechnicianRepository;

    @Override
    @Transactional
    public StaffRoomAssignmentResponse assignRoom(StaffRoomAssignmentRequest request, Long managerUserId) {
        validateStaffTypeAndId(request.getStaffType(), request.getStaffId());
        Room room = roomRepository.findById(request.getRoomId())
                .orElseThrow(() -> new IllegalArgumentException("Room not found: " + request.getRoomId()));
        if (!"ACTIVE".equals(room.getStatus())) {
            throw new IllegalStateException("Cannot assign staff to an inactive room");
        }
        validateCategoryMatchesStaffType(request.getStaffType(), room.getCategory());
        LocalDate date = request.getDate() != null ? request.getDate() : LocalDate.now();
        boolean isOverride = Boolean.TRUE.equals(request.getOneDayOverride());
        // Nếu phòng này chỉ chứa được 1 người (capacity <= 1)
        if (room.getCapacity() != null && room.getCapacity() <= 1) {
            boolean alreadyOccupied = isRoomOccupied(room.getId(), date, request.getStaffType(), request.getStaffId());

            if (alreadyOccupied) {
                // Nếu chưa xác nhận ghi đè -> Ném lỗi để Frontend hiển thị popup hỏi Admin
                if (!Boolean.TRUE.equals(request.getForceOverride())) {
                    throw new IllegalStateException(
                            "This room already has staff assigned for today. Confirm again with forceOverride=true to proceed.");
                } else {
                    // Nếu Admin xác nhận ghi đè -> Huỷ/Xoá các bản ghi override cũ của phòng này
                    // trong hôm nay
                    // Lưu ý: Nếu muốn an toàn, có thể dùng câu lệnh UPDATE status='INACTIVE' thay
                    // vì delete
                    List<StaffRoomAssignment> oldOverrides = assignmentRepository
                            .findByRoomIdAndWorkDateAndIsOneDayOverrideTrue(room.getId(), date);
                    assignmentRepository.deleteAll(oldOverrides);
                }
            }
        }
        StaffRoomAssignment assignment = StaffRoomAssignment.builder()
                .staffType(request.getStaffType())
                .staffId(request.getStaffId())
                .room(room)
                .effectiveFrom(isOverride ? null : date)
                .workDate(isOverride ? date : null)
                .isOneDayOverride(isOverride)
                .assignedBy(managerUserId)
                .build();
        if (!isOverride) {
            assignment.setEffectiveFrom(date);
        }
        StaffRoomAssignment saved = assignmentRepository.save(assignment);
        return toResponse(saved);
    }

    @Override
    @Transactional
    public List<StaffRoomAssignmentResponse> getRosterForDate(LocalDate date) {
        // Override đúng ngày trước, sau đó standing assignment mới nhất mỗi (staffType,
        // staffId)
        List<StaffRoomAssignment> overrides = assignmentRepository.findByWorkDateAndIsOneDayOverrideTrue(date);
        List<StaffRoomAssignment> standing = assignmentRepository
                .findByEffectiveFromLessThanEqualAndIsOneDayOverrideFalseOrderByStaffTypeAscStaffIdAscEffectiveFromDesc(
                        date);

        Map<String, StaffRoomAssignment> latestPerStaff = new HashMap<>();

        // Standing trước — giữ bản ghi effectiveFrom mới nhất cho mỗi nhân sự
        for (StaffRoomAssignment sra : standing) {
            String key = sra.getStaffType() + ":" + sra.getStaffId();
            latestPerStaff.merge(key, sra,
                    (existing, incoming) -> incoming.getEffectiveFrom().isAfter(existing.getEffectiveFrom()) ? incoming
                            : existing);
        }

        // Override ghi đè standing cho đúng ngày này
        for (StaffRoomAssignment sra : overrides) {
            String key = sra.getStaffType() + ":" + sra.getStaffId();
            latestPerStaff.put(key, sra);
        }

        return latestPerStaff.values().stream()
                .sorted(Comparator.comparing((StaffRoomAssignment s) -> s.getStaffType().name())
                        .thenComparing(StaffRoomAssignment::getStaffId))
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    /**
     * Cốt lõi BR-24 — dùng bởi UC-12/UC-19/UC-30/UC-41 để tự động resolve
     * phòng theo nhân sự đã chọn, không cần Patient/Receptionist chọn phòng.
     */
    @Override
    @Transactional
    public RoomResolutionResponse resolveRoomForStaff(StaffType staffType, Long staffId, LocalDate date) {
        LocalDate effectiveDate = date != null ? date : LocalDate.now();

        Optional<StaffRoomAssignment> override = assignmentRepository
                .findByStaffTypeAndStaffIdAndWorkDateAndIsOneDayOverrideTrue(staffType, staffId, effectiveDate);

        StaffRoomAssignment resolved = override.orElseGet(() -> {
            List<StaffRoomAssignment> standing = assignmentRepository.findStandingAssignments(staffType, staffId,
                    effectiveDate);
            return standing.isEmpty() ? null : standing.get(0); // đã ORDER BY effectiveFrom DESC
        });

        if (resolved == null || resolved.getRoom() == null) {
            return RoomResolutionResponse.builder()
                    .resolved(false)
                    .message("No room available for this role/category. Configure a room first (UC-55), "
                            + "then assign staff to it via Room Roster (UC-56).")
                    .build();
        }

        return RoomResolutionResponse.builder()
                .roomId(resolved.getRoom().getId())
                .roomName(resolved.getRoom().getName())
                .resolved(true)
                .build();
    }

    // ── Helpers ──────────────────────────────────────────────────────

    private boolean isRoomOccupied(Long roomId, LocalDate date, StaffType requestingStaffType, Long requestingStaffId) {
        List<StaffRoomAssignment> standing = assignmentRepository
                .findByRoomIdAndEffectiveFromLessThanEqualAndIsOneDayOverrideFalse(roomId, date);
        List<StaffRoomAssignment> overrides = assignmentRepository
                .findByRoomIdAndWorkDateAndIsOneDayOverrideTrue(roomId, date);

        return standing.stream().anyMatch(a -> !isSameStaff(a, requestingStaffType, requestingStaffId))
                || overrides.stream().anyMatch(a -> !isSameStaff(a, requestingStaffType, requestingStaffId));
    }

    private boolean isSameStaff(StaffRoomAssignment a, StaffType type, Long id) {
        return a.getStaffType() == type && a.getStaffId().equals(id);
    }

    /**
     * E-1 exception UC-56: kiểm tra staff_id tồn tại đúng bảng tương ứng
     * staffType (polymorphic reference — không có FK DB).
     */
    private void validateStaffTypeAndId(StaffType staffType, Long staffId) {
        if (staffType == null || staffId == null) {
            throw new IllegalArgumentException("staffType and staffId are required");
        }
        boolean exists;
        switch (staffType) {
            case DOCTOR:
                exists = doctorRepository.existsById(staffId);
                break;
            case NURSE:
                // Nurse dùng bảng staffs chung, lọc position = NURSE
                exists = staffRepository.findById(staffId)
                        .map(s -> "NURSE".equalsIgnoreCase(s.getPosition()))
                        .orElse(false);
                break;
            case LAB_TECHNICIAN:
                exists = labTechnicianRepository.existsById(staffId);
                break;
            default:
                exists = false;
        }
        if (!exists) {
            throw new IllegalArgumentException(
                    "Staff not found for staffType=" + staffType + ", staffId=" + staffId);
        }
    }

    /**
     * Đảm bảo Doctor chỉ được gán phòng CLINICAL_EXAM, Nurse chỉ CARE_RECOVERY,
     * Lab Technician chỉ DIAGNOSTIC_IMAGING hoặc OPTICAL_WORKSHOP.
     */
    private void validateCategoryMatchesStaffType(StaffType staffType, RoomCategory category) {
        boolean valid = switch (staffType) {
            case DOCTOR -> category == RoomCategory.CLINICAL_EXAM;
            case NURSE -> category == RoomCategory.CARE_RECOVERY;
            case LAB_TECHNICIAN -> category == RoomCategory.DIAGNOSTIC_IMAGING
                    || category == RoomCategory.OPTICAL_WORKSHOP;
        };
        if (!valid) {
            throw new IllegalStateException(
                    "Room category " + category + " does not match staff type " + staffType);
        }
    }

    private StaffRoomAssignmentResponse toResponse(StaffRoomAssignment a) {
        String staffName = switch (a.getStaffType()) {
            case DOCTOR -> doctorRepository.findById(a.getStaffId()).map(d -> d.getFullName()).orElse(null);
            case NURSE -> staffRepository.findById(a.getStaffId()).map(s -> s.getFullName()).orElse(null);
            case LAB_TECHNICIAN ->
                labTechnicianRepository.findById(a.getStaffId()).map(lt -> lt.getFullName()).orElse(null);
        };

        return StaffRoomAssignmentResponse.builder()
                .id(a.getId())
                .staffType(a.getStaffType())
                .staffId(a.getStaffId())
                .staffFullName(staffName)
                .roomId(a.getRoom().getId())
                .roomName(a.getRoom().getName())
                .effectiveFrom(a.getEffectiveFrom())
                .workDate(a.getWorkDate())
                .isOneDayOverride(a.getIsOneDayOverride())
                .assignedBy(a.getAssignedBy())
                .createdAt(a.getCreatedAt())
                .build();
    }
}