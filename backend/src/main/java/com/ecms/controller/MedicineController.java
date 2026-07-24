//Author: DucTKH - HE204463
//Created: 2026-06-22
//Last Update: 2026-07-23

// Controller quản lý danh mục Thuốc, cung cấp endpoint tìm kiếm thuốc phục vụ cho Bác sĩ kê đơn (UC-29) và Dược sĩ.
package com.ecms.controller;

import com.ecms.dto.response.ApiResponse;
import com.ecms.dto.response.MedicineResponse;
import com.ecms.service.MedicineService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/medicines")
@RequiredArgsConstructor
public class MedicineController {

    private final MedicineService medicineService;

    //API lấy danh sách và tìm kiếm thuốc để Bác sĩ có thể thêm vào Đơn thuốc (UC-29).
    @GetMapping
    public ResponseEntity<ApiResponse<List<MedicineResponse>>> getAllMedicines(
            @RequestParam(required = false) String keyword) {
        List<MedicineResponse> medicines = medicineService.searchMedicines(keyword);
        return ResponseEntity.ok(ApiResponse.success("Lấy danh sách thuốc thành công", medicines));
    }
}
