//Author: DucTKH - HE204463
//Created: 2026-07-20
//Last Update: 2026-07-26

package com.ecms.controller;

import com.ecms.dto.EyeglassCoatingDTO;
import com.ecms.dto.EyeglassFrameDTO;
import com.ecms.dto.LensTypeDTO;
import com.ecms.dto.response.ApiResponse;
import com.ecms.service.EyeglassCatalogService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/v1/eyeglass-catalog")
@RequiredArgsConstructor
public class EyeglassCatalogController {

    private final EyeglassCatalogService catalogService;

    @GetMapping("/lens-types")
    public ResponseEntity<ApiResponse<List<LensTypeDTO>>> getActiveLensTypes() {
        return ResponseEntity.ok(ApiResponse.success("Lấy danh sách loại tròng kính thành công", catalogService.getActiveLensTypes()));
    }

    @GetMapping("/frames")
    public ResponseEntity<ApiResponse<List<EyeglassFrameDTO>>> getActiveFrames() {
        return ResponseEntity.ok(ApiResponse.success("Lấy danh sách gọng kính thành công", catalogService.getActiveFrames()));
    }

    @GetMapping("/coatings")
    public ResponseEntity<ApiResponse<List<EyeglassCoatingDTO>>> getAllCoatings() {
        return ResponseEntity.ok(ApiResponse.success("Lấy danh sách lớp phủ thành công", catalogService.getAllCoatings()));
    }
}
