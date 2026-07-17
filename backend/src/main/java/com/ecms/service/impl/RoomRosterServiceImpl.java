package com.ecms.service.impl;

import com.ecms.dto.request.AssignRoomRequest;
import com.ecms.dto.response.RoomRosterEntry;
import com.ecms.dto.response.StaffRoomAssignmentResponse;
import com.ecms.entity.Room;
import com.ecms.entity.StaffRoomAssignment;
import com.ecms.entity.User;
import com.ecms.exception.ResourceNotFoundException;
import com.ecms.repository.RoomRepository;
import com.ecms.repository.StaffRoomAssignmentRepository;
import com.ecms.repository.UserRepository;
import com.ecms.service.AuditLogService;
import com.ecms.service.NotificationService;
import com.ecms.service.RoomRosterService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class RoomRosterServiceImpl implements RoomRosterService {

    /** Vai trò được phân phòng (UC-59) và loại phòng tương ứng của mỗi vai trò (BR-24). */
    private static final Map<String, String> ROLE_TO_ROOM_TYPE = Map.of(
            "DOCTOR", "DOCTOR",
            "NURSE", "NURSE",
            "LAB_TECHNICIAN", "LAB");

    private final StaffRoomAssignmentRepository staffRoomAssignmentRepository;
    private final RoomRepository roomRepository;
    private final UserRepository userRepository;
    private final AuditLogService auditLogService;
    private final NotificationService notificationService;

    @Override
    public List<RoomRosterEntry> getRosterForDate(LocalDate date) {
        List<RoomRosterEntry> roster = new java.util.ArrayList<>();
        for (String role : ROLE_TO_ROOM_TYPE.keySet()) {
            for (User staff : userRepository.findByRole_Name(role)) {
                StaffRoomAssignmentResponse current = resolveRoomForStaffOnDate(staff.getId(), date);
                roster.add(RoomRosterEntry.builder()
                        .staffUserId(staff.getId())
                        .staffFullName(staff.getFullName())
                        .staffRole(role)
                        .roomId(current != null ? current.getRoomId() : null)
                        .roomName(current != null ? current.getRoomName() : null)
                        .isOverrideToday(current != null && Boolean.TRUE.equals(current.getIsOverride()))
                        .build());
            }
        }
        return roster;
    }

    @Override
    @Transactional
    public StaffRoomAssignmentResponse assign(AssignRoomRequest request, String actorEmail, String ipAddress) {
        User staff = userRepository.findById(request.getStaffUserId())
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy nhân sự"));
        Room room = roomRepository.findById(request.getRoomId())
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy phòng"));
        if (!Boolean.TRUE.equals(room.getIsActive())) {
            throw new IllegalArgumentException("Phòng này đã bị vô hiệu hoá");
        }

        String staffRoleName = staff.getRole().getName();
        String requiredRoomType = ROLE_TO_ROOM_TYPE.get(staffRoleName);
        if (requiredRoomType == null) {
            throw new IllegalArgumentException("Nhân sự này không thuộc nhóm được phân phòng "
                    + "(chỉ áp dụng Bác sĩ/Điều dưỡng/Kỹ thuật viên xét nghiệm)");
        }
        // E-1: không có phòng phù hợp với nhóm nhân sự này.
        if (!requiredRoomType.equals(room.getRoomType())) {
            throw new IllegalArgumentException(
                    "Phòng này không phục vụ nhóm nhân sự của vai trò " + staffRoleName
                            + ". Vui lòng chọn phòng phù hợp (UC-58).");
        }

        boolean oneDayOnly = Boolean.TRUE.equals(request.getOneDayOnly());
        LocalDate targetDate;
        if (oneDayOnly) {
            if (request.getOverrideDate() == null) {
                throw new IllegalArgumentException("Vui lòng chọn ngày áp dụng cho việc đổi phòng 1 ngày");
            }
            targetDate = request.getOverrideDate();
        } else {
            targetDate = request.getEffectiveFrom() != null ? request.getEffectiveFrom() : LocalDate.now();
        }

        // E-2: kiểm tra sức chứa phòng cho ngày áp dụng (bỏ qua chính nhân sự đang được gán lại).
        long occupants = staffRoomAssignmentRepository.findByRoomOnDate(room.getId(), targetDate).stream()
                .filter(a -> !a.getStaffUser().getId().equals(staff.getId()))
                .count();
        if (occupants >= room.getCapacity() && !Boolean.TRUE.equals(request.getForceOverrideCapacity())) {
            throw new IllegalArgumentException(
                    "Phòng đã đủ sức chứa (" + room.getCapacity() + " người) cho ngày " + targetDate
                            + ". Xác nhận lại để vẫn phân công (ghi đè).");
        }

        User assignedBy = userRepository.findByEmail(actorEmail)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy tài khoản người thực hiện"));

        StaffRoomAssignment assignment;
        boolean isNew;
        if (oneDayOnly) {
            assignment = staffRoomAssignmentRepository
                    .findByStaffUser_IdAndIsOverrideTrueAndOverrideDate(staff.getId(), targetDate)
                    .orElse(null);
            isNew = assignment == null;
            if (assignment == null) {
                assignment = StaffRoomAssignment.builder()
                        .staffUser(staff)
                        .isOverride(true)
                        .overrideDate(targetDate)
                        .build();
            }
        } else {
            assignment = staffRoomAssignmentRepository
                    .findByStaffUser_IdAndIsOverrideFalseAndEffectiveFrom(staff.getId(), targetDate)
                    .orElse(null);
            isNew = assignment == null;
            if (assignment == null) {
                assignment = StaffRoomAssignment.builder()
                        .staffUser(staff)
                        .isOverride(false)
                        .effectiveFrom(targetDate)
                        .build();
            }
        }
        assignment.setRoom(room);
        assignment.setAssignedBy(assignedBy);
        StaffRoomAssignment saved = staffRoomAssignmentRepository.save(assignment);

        auditLogService.log(assignedBy.getId(), isNew ? "ASSIGN_STAFF_ROOM" : "REASSIGN_STAFF_ROOM",
                "StaffRoomAssignment", String.valueOf(saved.getId()), null, snapshot(saved), ipAddress);

        notifyStaffAssigned(staff, room, targetDate, oneDayOnly);

        return toResponse(saved);
    }

    @Override
    public List<StaffRoomAssignmentResponse> getAssignmentsByRoom(Long roomId) {
        return staffRoomAssignmentRepository.findByRoom_IdOrderByCreatedAtDesc(roomId).stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    @Override
    public StaffRoomAssignmentResponse resolveRoomForStaffOnDate(Long staffUserId, LocalDate date) {
        StaffRoomAssignment override = staffRoomAssignmentRepository
                .findByStaffUser_IdAndIsOverrideTrueAndOverrideDate(staffUserId, date)
                .orElse(null);
        if (override != null) return toResponse(override);

        List<StaffRoomAssignment> standing = staffRoomAssignmentRepository
                .findStandingAssignmentsUpToDate(staffUserId, date);
        if (!standing.isEmpty()) return toResponse(standing.get(0));

        return null;
    }

    // ── Helpers ──────────────────────────────────────────────────────────

    private void notifyStaffAssigned(User staff, Room room, LocalDate date, boolean oneDayOnly) {
        try {
            notificationService.createForUser(staff.getId(),
                    (oneDayOnly
                            ? "Bạn được đổi sang phòng " + room.getName() + " cho riêng ngày " + date
                            : "Bạn được phân công phòng " + room.getName() + " kể từ ngày " + date),
                    null);
        } catch (Exception e) {
            log.error("UC-59: Gửi thông báo phân công phòng thất bại: {}", e.getMessage());
        }
    }

    private Map<String, Object> snapshot(StaffRoomAssignment a) {
        Map<String, Object> map = new HashMap<>();
        map.put("staffUserId", a.getStaffUser().getId());
        map.put("roomId", a.getRoom().getId());
        map.put("effectiveFrom", a.getEffectiveFrom());
        map.put("isOverride", a.getIsOverride());
        map.put("overrideDate", a.getOverrideDate());
        return map;
    }

    private StaffRoomAssignmentResponse toResponse(StaffRoomAssignment a) {
        return StaffRoomAssignmentResponse.builder()
                .id(a.getId())
                .staffUserId(a.getStaffUser().getId())
                .staffFullName(a.getStaffUser().getFullName())
                .staffRole(a.getStaffUser().getRole().getName())
                .roomId(a.getRoom().getId())
                .roomName(a.getRoom().getName())
                .roomType(a.getRoom().getRoomType())
                .effectiveFrom(a.getEffectiveFrom())
                .isOverride(a.getIsOverride())
                .overrideDate(a.getOverrideDate())
                .assignedById(a.getAssignedBy() != null ? a.getAssignedBy().getId() : null)
                .assignedByName(a.getAssignedBy() != null ? a.getAssignedBy().getFullName() : null)
                .createdAt(a.getCreatedAt())
                .build();
    }
}
