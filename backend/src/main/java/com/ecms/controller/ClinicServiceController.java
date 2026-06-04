// Mạnh Hùng - HE200743
// Controller cung cấp API lấy danh sách dịch vụ khám chữa bệnh của phòng khám.
// Dùng để hiển thị thông tin dịch vụ trên trang chủ và các trang liên quan.
package com.ecms.controller;

import com.ecms.dto.response.ApiResponse;
import com.ecms.dto.response.ClinicServiceResponse;
import com.ecms.repository.ClinicServiceRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/v1/services")
@RequiredArgsConstructor
public class ClinicServiceController {

    private final ClinicServiceRepository clinicServiceRepository;

    // Lấy toàn bộ danh sách dịch vụ từ database và chuyển đổi sang DTO để trả về client
    @GetMapping
    public ResponseEntity<ApiResponse<List<ClinicServiceResponse>>> getAllServices() {
        List<ClinicServiceResponse> services = clinicServiceRepository.findAll()
                .stream()
                .map(s -> ClinicServiceResponse.builder()
                        .id(s.getId())
                        .serviceName(s.getServiceName())
                        .description(s.getDescription())
                        .price(s.getPrice())
                        .durationMinutes(s.getDurationMinutes())
                        .build())
                .collect(Collectors.toList());

        return ResponseEntity.ok(ApiResponse.success(services));
    }
}
