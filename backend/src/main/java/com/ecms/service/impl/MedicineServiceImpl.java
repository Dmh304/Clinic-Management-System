package com.ecms.service.impl;

import com.ecms.dto.response.MedicineResponse;
import com.ecms.entity.Medicine;
import com.ecms.repository.MedicineRepository;
import com.ecms.service.MedicineService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class MedicineServiceImpl implements MedicineService {

    private final MedicineRepository medicineRepository;

    @Override
    public List<MedicineResponse> getAllMedicines() {
        return medicineRepository.findAll().stream().map(this::toResponse).collect(Collectors.toList());
    }

    @Override
    public List<MedicineResponse> searchMedicines(String keyword) {
        if (keyword == null || keyword.trim().isEmpty()) {
            return getAllMedicines();
        }
        return medicineRepository.findByNameContainingIgnoreCase(keyword.trim()).stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    private MedicineResponse toResponse(Medicine medicine) {
        return MedicineResponse.builder()
                .id(medicine.getId())
                .name(medicine.getName())
                .dosageForm(medicine.getDosageForm())
                .unit(medicine.getUnit())
                .unitPrice(medicine.getUnitPrice())
                .build();
    }
}
