package com.ecms.service.impl;

import com.ecms.dto.response.StaffResponse;
import com.ecms.entity.Staff;
import com.ecms.repository.StaffRepository;
import com.ecms.service.StaffService;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class StaffServiceImpl implements StaffService {

    private final StaffRepository staffRepository;

    @Override
    @Transactional
    public List<StaffResponse> getStaffByPosition(String position, String status) {
        String effectiveStatus = status != null ? status : "ACTIVE";
        return staffRepository.findByPositionIgnoreCaseAndStatus(position, effectiveStatus)
                .stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional
    public List<StaffResponse> getAllStaff(String status) {
        String effectiveStatus = status != null ? status : "ACTIVE";
        return staffRepository.findByStatus(effectiveStatus)
                .stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    private StaffResponse toResponse(Staff staff) {
        return StaffResponse.builder()
                .id(staff.getId())
                .employeeCode(staff.getEmployeeCode())
                .fullName(staff.getFullName())
                .department(staff.getDepartment())
                .position(staff.getPosition())
                .phoneNumber(staff.getPhoneNumber())
                .status(staff.getStatus())
                .build();
    }
}