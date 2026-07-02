// DucTKH
// Controller API quản lý danh mục Thuốc, cung cấp endpoint để tìm kiếm thuốc.
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

    @GetMapping
    public ResponseEntity<ApiResponse<List<MedicineResponse>>> getAllMedicines(
            @RequestParam(required = false) String keyword) {
        List<MedicineResponse> medicines = medicineService.searchMedicines(keyword);
        return ResponseEntity.ok(ApiResponse.success("Lấy danh sách thuốc thành công", medicines));
    }
}
