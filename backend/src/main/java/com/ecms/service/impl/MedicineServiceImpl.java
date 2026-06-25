// DucTKH
// Service xử lý logic nghiệp vụ liên quan đến Thuốc, như tìm kiếm và lấy danh sách thuốc.
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

    // Lấy toàn bộ danh sách thuốc hiện có trong hệ thống 
    @Override
    public List<MedicineResponse> getAllMedicines() {
        return medicineRepository.findAll().stream().map(this::toResponse).collect(Collectors.toList());
    }

    // Tìm kiếm thuốc dựa theo từ khóa
    @Override
    public List<MedicineResponse> searchMedicines(String keyword) {
        // Kiểm tra nếu từ khóa rỗng hoặc null thì trả về toàn bộ danh sách
        if (keyword == null || keyword.trim().isEmpty()) {
            return getAllMedicines();
        }
        return medicineRepository.findByNameContainingIgnoreCase(keyword.trim()).stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    // Hàm bổ trợ chuyển đổi từ Entity sang DTO
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
