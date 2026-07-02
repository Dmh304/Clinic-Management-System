package com.ecms.service;

import com.ecms.dto.response.MedicineResponse;
import java.util.List;

public interface MedicineService {
    List<MedicineResponse> getAllMedicines();
    List<MedicineResponse> searchMedicines(String keyword);
}
