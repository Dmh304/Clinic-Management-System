/**
 * Author: Tuấn - HE204215
 * 
 * Controller quản lí hồ sơ bệnh án điện tử
 * Cung cấp các API để lưu trữ thông tin bệnh án, tra cứu theo lịch hẹn và xem lịch sử khám bệnh
 */

package com.ecms.controller;

import com.ecms.dto.request.EMRRequest;
import com.ecms.dto.response.ApiResponse;
import com.ecms.dto.response.EMRResponse;
import com.ecms.entity.Doctor;
import com.ecms.entity.MedicalRecord;
import com.ecms.entity.Patient;
import com.ecms.exception.ResourceNotFoundException;
import com.ecms.repository.DoctorRepository;
import com.ecms.repository.MedicalRecordRepository;
import com.ecms.repository.PatientRepository;
import com.ecms.service.EMRService;
import lombok.RequiredArgsConstructor;

import org.apache.catalina.connector.Response;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/emr")
@RequiredArgsConstructor
public class EMRController {

    /* Dịch vụ xử lí logic nghiệp vụ của hồ sơ bệnh án điện tử */
    private final EMRService emrService;
    private final DoctorRepository doctorRepository;
    private final PatientRepository patientRepository;

    /* Tạo mới hoặc cập nhật hồ sơ bệnh án điện tử */
    @PostMapping
    public ResponseEntity<ApiResponse<EMRResponse>> saveEMR(@RequestBody EMRRequest request) {
        return ResponseEntity.ok(ApiResponse.success(emrService.saveEMR(request)));
    }

    /*
     * Lấy thông tin hồ sơ bệnh án điện tử dựa trên mã định danh của lịch hẹn
     * Mỗi lịch hẹn hoàn thành gắn liền với 1 bệnh án cụ thể
     */
    @GetMapping("/appointment/{appointmentId}")
    public ResponseEntity<ApiResponse<EMRResponse>> getByAppointment(@PathVariable Long appointmentId) {
        return ResponseEntity.ok(ApiResponse.success(emrService.getByAppointmentId(appointmentId)));
    }

    /* Lấy chi tiết một hồ sơ bệnh án dựa trên chính ID của nó */
    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<EMRResponse>> getEMRById(
            @PathVariable Long id,
            @AuthenticationPrincipal UserDetails userDetails) {

        EMRResponse emr = emrService.getById(id);
        if (emr == null) {
            throw new ResourceNotFoundException("Hồ sơ bệnh án không tồn tại: " + id);
        }

        Long patientId = resolvePatientId(userDetails);
        Long doctorId = resolveDoctorId(userDetails);
        boolean isAdmin = userDetails != null && userDetails.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN"));

        boolean isOwner = isAdmin
                || (patientId != null && patientId.equals(emr.getPatientId()))
                || (doctorId != null && doctorId.equals(emr.getDoctorId()));

        if (!isOwner) {
            throw new AccessDeniedException("Bạn không có quyền xem hồ sơ bệnh án này");
        }

        return ResponseEntity.ok(ApiResponse.success(emr));
    }

    /* Lấy danh sách lịch sử tất cả các hồ sơ bệnh án điện tử của một bệnh nhân */
    @GetMapping("/patient/{patientId}/history")
    public ResponseEntity<ApiResponse<List<EMRResponse>>> getPatientHistory(@PathVariable Long patientId) {
        return ResponseEntity.ok(ApiResponse.success(emrService.getPatientHistory(patientId)));
    }

    /* Lấy danh sách tất cả lịch sử bệnh án */
    @GetMapping("/all")
    public ResponseEntity<ApiResponse<List<EMRResponse>>> getAllList() {
        return ResponseEntity.ok(ApiResponse.success(emrService.getAllList()));
    }

    // @GetMapping("/completed")
    // public ResponseEntity<ApiResponse<List<EMRResponse>>> getCompletedList(
    // @AuthenticationPrincipal UserDetails userDetails) {
    // Long doctorId = resolveDoctorId(userDetails);
    // return
    // ResponseEntity.ok(ApiResponse.success(emrService.getCompletedList(doctorId)));
    // }

    @GetMapping("/history")
    public ResponseEntity<ApiResponse<List<EMRResponse>>> getPatientHistoryEMR(
            @AuthenticationPrincipal UserDetails userDetails) {
        Long patientId = resolvePatientId(userDetails);
        return ResponseEntity.ok(ApiResponse.success(emrService.getPatientHistory(patientId)));
    }

    /* Tìm kiếm và trả về id của bác sĩ dựa trên thông tin tài khoản đăng nhập */
    private Long resolveDoctorId(UserDetails userDetails) {
        if (userDetails == null) {
            return null;
        }
        return doctorRepository.findByEmail(userDetails.getUsername()).map(Doctor::getId).orElse(null);
    }

    private Long resolvePatientId(UserDetails userDetails) {
        if (userDetails == null) {
            return null;
        }
        return patientRepository.findByUser_Email(userDetails.getUsername()).map(Patient::getId).orElse(null);
    }
}
