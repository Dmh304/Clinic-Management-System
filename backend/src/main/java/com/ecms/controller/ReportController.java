package com.ecms.controller;

import com.ecms.dto.response.ApiResponse;
import com.ecms.service.ReportService;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

/**
 * UC-49/50/51/52/53: Báo cáo & phân tích cho Quản lý phòng khám.
 * Base URL: /api/v1/reports (chỉ MANAGER/ADMIN — cấu hình ở SecurityConfig).
 * Tham số from/to định dạng ISO yyyy-MM-dd; mặc định = đầu tháng → hôm nay.
 */
@RestController
@RequestMapping("/api/v1/reports")
@RequiredArgsConstructor
public class ReportController {

    private final ReportService reportService;

    // UC-49: Dashboard vận hành thời gian thực
    @GetMapping("/dashboard")
    public ResponseEntity<ApiResponse<Map<String, Object>>> dashboard() {
        return ResponseEntity.ok(ApiResponse.success(reportService.operationalDashboard()));
    }

    // UC-50: Báo cáo doanh thu
    @GetMapping("/revenue")
    public ResponseEntity<ApiResponse<Map<String, Object>>> revenue(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        LocalDate[] range = defaultRange(from, to);
        return ResponseEntity.ok(ApiResponse.success(reportService.revenueReport(range[0], range[1])));
    }

    // UC-51: Thống kê bệnh nhân
    @GetMapping("/patient-statistics")
    public ResponseEntity<ApiResponse<Map<String, Object>>> patientStatistics(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        LocalDate[] range = defaultRange(from, to);
        return ResponseEntity.ok(ApiResponse.success(reportService.patientStatistics(range[0], range[1])));
    }

    // UC-52: Hiệu suất nhân viên
    @GetMapping("/staff-performance")
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> staffPerformance(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        LocalDate[] range = defaultRange(from, to);
        return ResponseEntity.ok(ApiResponse.success(reportService.staffPerformance(range[0], range[1])));
    }

    // UC-53: Báo cáo đánh giá
    @GetMapping("/feedback")
    public ResponseEntity<ApiResponse<Map<String, Object>>> feedback(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        LocalDate[] range = defaultRange(from, to);
        return ResponseEntity.ok(ApiResponse.success(reportService.feedbackReport(range[0], range[1])));
    }

    // Mặc định: từ đầu tháng hiện tại tới hôm nay
    private LocalDate[] defaultRange(LocalDate from, LocalDate to) {
        LocalDate today = LocalDate.now();
        LocalDate f = from != null ? from : today.withDayOfMonth(1);
        LocalDate t = to != null ? to : today;
        return new LocalDate[] { f, t };
    }
}
