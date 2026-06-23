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
import com.ecms.service.EMRService;
import lombok.RequiredArgsConstructor;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/emr")
@RequiredArgsConstructor
public class EMRController {

    /* Dịch vụ xử lí logic nghiệp vụ của hồ sơ bệnh án điện tử */
    private final EMRService emrService;

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

    /* Lấy danh sách lịch sử tất cả các hồ sơ bệnh án điện tử của một bệnh nhân */
    @GetMapping("/patient/{patientId}/history")
    public ResponseEntity<ApiResponse<List<EMRResponse>>> getPatientHistory(@PathVariable Long patientId) {
        return ResponseEntity.ok(ApiResponse.success(emrService.getPatientHistory(patientId)));
    }

    /* Lấy danh sách tất cả lịch sử bệnh án */
    @GetMapping("/completed")
    public ResponseEntity<ApiResponse<List<EMRResponse>>> getCompletedList() {
        return ResponseEntity.ok(ApiResponse.success(emrService.getCompletedList()));
    }
}
