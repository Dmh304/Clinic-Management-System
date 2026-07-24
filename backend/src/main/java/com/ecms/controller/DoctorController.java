package com.ecms.controller;

import com.ecms.dto.request.UpdateDoctorAvatarRequest;
import com.ecms.dto.request.UpdateDoctorFeaturedRequest;
import com.ecms.dto.request.UpdateDoctorProfileRequest;
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
    public ResponseEntity<ApiResponse<List<DoctorResponse>>> getAllDoctors(
            @RequestParam(required = false) Boolean featured) {
        List<DoctorResponse> doctors = doctorRepository.findByStatus("ACTIVE")
                .stream()
                .filter(d -> featured == null || featured.equals(d.getFeatured()))
                .map(this::toResponse)
                .collect(Collectors.toList());

        return ResponseEntity.ok(ApiResponse.success(doctors));
    }

    /* Thông tin chi tiết 1 bác sĩ — dùng cho trang public "Chi tiết bác sĩ" */
    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<DoctorResponse>> getDoctorById(@PathVariable Long id) {
        Doctor doctor = doctorRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Bác sĩ không tồn tại: " + id));
        return ResponseEntity.ok(ApiResponse.success(toResponse(doctor)));
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

    /* Cập nhật hồ sơ công khai của bác sĩ (tên, chuyên khoa, thành tựu...) — MANAGER/ADMIN */
    @PatchMapping("/{id}")
    public ResponseEntity<ApiResponse<DoctorResponse>> updateProfile(
            @PathVariable Long id,
            @Valid @RequestBody UpdateDoctorProfileRequest request) {
        Doctor doctor = doctorRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Bác sĩ không tồn tại: " + id));

        if (request.getFullName() != null) doctor.setFullName(request.getFullName());
        if (request.getAcademicTitle() != null) doctor.setAcademicTitle(request.getAcademicTitle());
        if (request.getSpecialization() != null) doctor.setSpecialization(request.getSpecialization());
        if (request.getDepartment() != null) doctor.setDepartment(request.getDepartment());
        if (request.getPhone() != null) doctor.setPhone(request.getPhone());
        if (request.getEmail() != null) doctor.setEmail(request.getEmail());
        if (request.getExperienceYears() != null) doctor.setExperienceYears(request.getExperienceYears());
        if (request.getBio() != null) doctor.setBio(request.getBio());
        if (request.getAchievements() != null) doctor.setAchievements(request.getAchievements());
        if (request.getCareerHistory() != null) doctor.setCareerHistory(request.getCareerHistory());

        Doctor saved = doctorRepository.save(doctor);
        return ResponseEntity.ok(ApiResponse.success(toResponse(saved)));
    }

    /* Bật/tắt hiển thị bác sĩ ở khối "Bác sĩ - Chuyên gia" trên trang chủ — MANAGER/ADMIN */
    @PatchMapping("/{id}/featured")
    public ResponseEntity<ApiResponse<DoctorResponse>> updateFeatured(
            @PathVariable Long id,
            @Valid @RequestBody UpdateDoctorFeaturedRequest request) {
        Doctor doctor = doctorRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Bác sĩ không tồn tại: " + id));
        doctor.setFeatured(request.getFeatured());
        Doctor saved = doctorRepository.save(doctor);
        return ResponseEntity.ok(ApiResponse.success(toResponse(saved)));
    }

    private DoctorResponse toResponse(Doctor d) {
        return DoctorResponse.builder()
                .id(d.getId())
                .fullName(d.getFullName())
                .academicTitle(d.getAcademicTitle())
                .specialization(d.getSpecialization())
                .phone(d.getPhone())
                .email(d.getEmail())
                .department(d.getDepartment())
                .experienceYears(d.getExperienceYears())
                .bio(d.getBio())
                .achievements(d.getAchievements())
                .careerHistory(d.getCareerHistory())
                .avatarUrl(d.getAvatarUrl())
                .featured(d.getFeatured())
                .build();
    }
}
