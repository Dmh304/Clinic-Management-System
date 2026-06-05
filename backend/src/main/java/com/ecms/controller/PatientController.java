// Le Thi Bich Ngan - HE204710
// REST Controller xử lý các request HTTP liên quan đến bệnh nhân.
// Cung cấp 2 endpoint: đăng ký bệnh nhân vãng lai (POST /api/v1/patients/walk-in)
// và tìm kiếm bệnh nhân theo tên hoặc số điện thoại (GET /api/v1/patients/search).

package com.ecms.controller;

import com.ecms.dto.request.PatientRequest;
import com.ecms.dto.response.ApiResponse;
import com.ecms.dto.response.PatientResponse;
import com.ecms.service.PatientService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * Controller quản lý hồ sơ và thông tin Bệnh nhân (Patients).
 * Cung cấp các API tìm kiếm bệnh nhân và đăng ký hồ sơ bệnh nhân vãng lai.
 * DucTKH
 */
@RestController
@RequestMapping("/api/v1/patients")
@RequiredArgsConstructor
public class PatientController {

    private final PatientService patientService;

    /**
     * API Đăng ký hồ sơ bệnh nhân vãng lai mới trực tiếp tại quầy.
     * DucTKH
     */
    // Đăng ký bệnh nhân vãng lai: nhận dữ liệu từ lễ tân, gọi service tạo hồ sơ và trả về HTTP 201
    @PostMapping("/walk-in")
    public ResponseEntity<ApiResponse<PatientResponse>> createWalkInPatient(
            @Valid @RequestBody PatientRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success(patientService.createWalkInPatient(request)));
    }

    /**
     * API Tìm kiếm bệnh nhân theo từ khóa (họ tên, số điện thoại, mã bệnh nhân).
     * DucTKH
     */
    // Tìm kiếm bệnh nhân theo từ khóa (tên hoặc SĐT); không truyền keyword thì trả về toàn bộ danh sách
    @GetMapping("/search")
    public ResponseEntity<ApiResponse<List<PatientResponse>>> searchPatients(
            @RequestParam(required = false) String keyword) {
        return ResponseEntity.ok(ApiResponse.success(patientService.searchPatients(keyword)));
    }
}
