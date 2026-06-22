package com.ecms.controller;

import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.ecms.dto.request.LabOrderRequest;
import com.ecms.dto.request.LabResultRequest;
import com.ecms.dto.response.ApiResponse;
import com.ecms.dto.response.LabOrderResponse;
import com.ecms.dto.response.LabResultResponse;
import com.ecms.entity.Doctor;
import com.ecms.entity.LabOrder;
import com.ecms.entity.LabTechnician;
import com.ecms.entity.Patient;
import com.ecms.repository.DoctorRepository;
import com.ecms.repository.LabTechnicianRepository;
import com.ecms.repository.PatientRepository;
import com.ecms.service.LabOrderService;

import lombok.RequiredArgsConstructor;

import java.util.List;

import org.springframework.boot.autoconfigure.couchbase.CouchbaseProperties.Authentication;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestParam;

@RestController
@RequestMapping("/api/v1/lab")
@RequiredArgsConstructor
public class LabOrderController {
    private final LabOrderService labOrderService;
    private final DoctorRepository doctorRepository;
    private final LabTechnicianRepository labTechnicianRepository;
    private final PatientRepository patientRepository;

    @PostMapping
    public ResponseEntity<ApiResponse<LabOrderResponse>> createLabOrder(@RequestBody LabOrderRequest request,
            @AuthenticationPrincipal UserDetails userDetails) {
        Long doctorId = resolveDoctorId(userDetails);
        return ResponseEntity.ok(ApiResponse.success(labOrderService.createLabOrder(request, doctorId)));
    }

    @GetMapping("/queue")
    public ResponseEntity<ApiResponse<List<LabOrderResponse>>> getLabOrderQueue(
            @AuthenticationPrincipal UserDetails userDetails) {
        Long labTechnicianId = resolveLabTechnicianId(userDetails);
        return ResponseEntity.ok(ApiResponse.success(labOrderService.getLabQueue(labTechnicianId)));
    }

    @PutMapping("/{id}/result")
    public ResponseEntity<ApiResponse<LabOrderResponse>> submitResult(@PathVariable Long id,
            @RequestBody LabResultRequest request, @AuthenticationPrincipal UserDetails userDetails) {
        Long labTechnicianId = resolveLabTechnicianId(userDetails);
        return ResponseEntity.ok(ApiResponse.success(labOrderService.submitLabResult(id, request, labTechnicianId)));
    }

    @GetMapping("/emr/{medicalRecordId}")
    public ResponseEntity<ApiResponse<List<LabOrderResponse>>> getLabOrdersForMedicalRecord(
            @PathVariable Long medicalRecordId) {
        return ResponseEntity.ok(ApiResponse.success(labOrderService.getLabOrdersForMedicalRecord(medicalRecordId)));
    }

    @GetMapping("/{id}/results")
    public ResponseEntity<ApiResponse<LabResultResponse>> getLabResults(@PathVariable Long id,
            @AuthenticationPrincipal UserDetails userDetails) {
        Long currentUserId = resolveDoctorId(userDetails);
        String role = "DOCTOR";
        if (currentUserId == null) {
            currentUserId = resolvePatientId(userDetails);
            role = "PATIENT";
        }
        return ResponseEntity.ok(ApiResponse.success(labOrderService.getLabResults(id, currentUserId, role)));
    }

    @PutMapping("/{id}/approve")
    public ResponseEntity<ApiResponse<LabOrderResponse>> approveLabResult(@PathVariable Long id,
            @AuthenticationPrincipal UserDetails userDetails) {
        Long doctorId = resolveDoctorId(userDetails);
        return ResponseEntity.ok(ApiResponse.success(labOrderService.approveLabResult(id, doctorId)));
    }

    @PutMapping("/{id}/retest")
    public ResponseEntity<ApiResponse<LabOrderResponse>> requestRetest(@PathVariable Long id,
            @RequestBody LabOrderRequest request, @AuthenticationPrincipal UserDetails userDetails) {
        Long doctorId = resolveDoctorId(userDetails);
        return ResponseEntity.ok(ApiResponse.success(labOrderService.requestRetest(id, doctorId, request)));
    }

    /* Tìm kiếm và trả về id của bác sĩ dựa trên thông tin tài khoản đăng nhập */
    private Long resolveDoctorId(UserDetails userDetails) {
        if (userDetails == null) {
            return null;
        }
        return doctorRepository.findByEmail(userDetails.getUsername()).map(Doctor::getId).orElse(null);
    }

    /* Tìm kiếm và trả về id của bác sĩ dựa trên thông tin tài khoản đăng nhập */
    private Long resolveLabTechnicianId(UserDetails userDetails) {
        if (userDetails == null) {
            return null;
        }
        return labTechnicianRepository.findByEmail(userDetails.getUsername()).map(LabTechnician::getId).orElse(null);
    }

    /* Tìm kiếm và trả về id của bác sĩ dựa trên thông tin tài khoản đăng nhập */
    private Long resolvePatientId(UserDetails userDetails) {
        if (userDetails == null) {
            return null;
        }
        return patientRepository.findByEmail(userDetails.getUsername()).map(Patient::getId).orElse(null);
    }
}
