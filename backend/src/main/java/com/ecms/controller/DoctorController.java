package com.ecms.controller;

import com.ecms.dto.request.UpdateDoctorAvatarRequest;
import com.ecms.dto.response.ApiResponse;
import com.ecms.dto.response.DoctorResponse;
import com.ecms.entity.Doctor;
import com.ecms.exception.ResourceNotFoundException;
import com.ecms.repository.DoctorRepository;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/v1/doctors")
@RequiredArgsConstructor
public class DoctorController {

    private final DoctorRepository doctorRepository;

    @GetMapping
    public ResponseEntity<ApiResponse<List<DoctorResponse>>> getAllDoctors() {
        List<DoctorResponse> doctors = doctorRepository.findAll()
                .stream()
                .map(d -> DoctorResponse.builder()
                        .id(d.getId())
                        .fullName(d.getFullName())
                        .specialization(d.getSpecialization())
                        .phone(d.getPhone())
                        .email(d.getEmail())
                        .build())
                .collect(Collectors.toList());

        return ResponseEntity.ok(ApiResponse.success(doctors));
    }

    /**
     * Cập nhật ảnh đại diện bác sĩ — MANAGER/ADMIN, dùng sau khi upload qua
     * /api/v1/files/upload
     */
    @PatchMapping("/{id}/avatar")
    public ResponseEntity<ApiResponse<DoctorResponse>> updateAvatar(
            @PathVariable Long id,
            @Valid @RequestBody UpdateDoctorAvatarRequest request) {
        Doctor doctor = doctorRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Bác sĩ không tồn tại: " + id));
        doctor.setAvatarUrl(request.getAvatarUrl());
        Doctor saved = doctorRepository.save(doctor);
        return ResponseEntity.ok(ApiResponse.success(toResponse(saved)));
    }

    private DoctorResponse toResponse(Doctor d) {
        return DoctorResponse.builder()
                .id(d.getId())
                .fullName(d.getFullName())
                .specialization(d.getSpecialization())
                .phone(d.getPhone())
                .email(d.getEmail())
                .department(d.getDepartment())
                .experienceYears(d.getExperienceYears())
                .bio(d.getBio())
                .avatarUrl(d.getAvatarUrl())
                .build();
    }
}
