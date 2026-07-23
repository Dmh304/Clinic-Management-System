package com.ecms.service;

import com.ecms.dto.EyeglassCoatingDTO;
import com.ecms.dto.EyeglassFrameDTO;
import com.ecms.dto.LensTypeDTO;
import com.ecms.repository.EyeglassCoatingRepository;
import com.ecms.repository.EyeglassFrameRepository;
import com.ecms.repository.LensTypeRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class EyeglassCatalogService {

    private final LensTypeRepository lensTypeRepository;
    private final EyeglassFrameRepository frameRepository;
    private final EyeglassCoatingRepository coatingRepository;

    @Transactional(readOnly = true)
    public List<LensTypeDTO> getActiveLensTypes() {
        return lensTypeRepository.findByStatus("ACTIVE").stream()
                .map(l -> LensTypeDTO.builder()
                        .id(l.getId())
                        .name(l.getName())
                        .description(l.getDescription())
                        .basePrice(l.getBasePrice())
                        .status(l.getStatus())
                        .build())
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<EyeglassFrameDTO> getActiveFrames() {
        return frameRepository.findByStatus("ACTIVE").stream()
                .map(f -> EyeglassFrameDTO.builder()
                        .id(f.getId())
                        .name(f.getName())
                        .brand(f.getBrand())
                        .material(f.getMaterial())
                        .color(f.getColor())
                        .price(f.getPrice())
                        .stockQuantity(f.getStockQuantity())
                        .status(f.getStatus())
                        .build())
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<EyeglassCoatingDTO> getAllCoatings() {
        return coatingRepository.findAll().stream()
                .map(c -> EyeglassCoatingDTO.builder()
                        .id(c.getId())
                        .name(c.getName())
                        .description(c.getDescription())
                        .price(c.getPrice())
                        .build())
                .collect(Collectors.toList());
    }
}
