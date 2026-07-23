package com.ecms.controller;

import com.ecms.dto.EyeglassCoatingDTO;
import com.ecms.dto.EyeglassFrameDTO;
import com.ecms.dto.LensTypeDTO;
import com.ecms.service.EyeglassCatalogService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/eyeglass-catalog")
@RequiredArgsConstructor
public class EyeglassCatalogController {

    private final EyeglassCatalogService catalogService;

    @GetMapping("/lens-types")
    public ResponseEntity<List<LensTypeDTO>> getActiveLensTypes() {
        return ResponseEntity.ok(catalogService.getActiveLensTypes());
    }

    @GetMapping("/frames")
    public ResponseEntity<List<EyeglassFrameDTO>> getActiveFrames() {
        return ResponseEntity.ok(catalogService.getActiveFrames());
    }

    @GetMapping("/coatings")
    public ResponseEntity<List<EyeglassCoatingDTO>> getAllCoatings() {
        return ResponseEntity.ok(catalogService.getAllCoatings());
    }
}
