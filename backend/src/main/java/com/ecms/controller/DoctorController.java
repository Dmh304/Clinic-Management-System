package com.ecms.controller;

import com.ecms.dto.response.ApiResponse;
import com.ecms.dto.response.DoctorResponse;
import com.ecms.repository.DoctorRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

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
}
