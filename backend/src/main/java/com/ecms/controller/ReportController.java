package com.ecms.controller;

import com.ecms.dto.response.ApiResponse;
import com.ecms.service.ReportService;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.io.IOException;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;

/**
 * @author      ThangNB - HE201024
 * @contributor Đồng Mạnh Hùng - HE200743
 * @created     2026-07-19
 * @updated     2026-07-19
 *
 * Reporting and analytics API for the Clinic Manager.
 * Base URL: /api/v1/reports — restricted to MANAGER / ADMIN in SecurityConfig.
 *
 * Covers UC-49 (real-time operational dashboard), UC-50 (revenue report),
 * UC-51 (patient statistics), UC-52 (staff performance) and UC-53 (feedback
 * report), plus the CSV exports those use cases offer.
 *
 * {@code from} / {@code to} are ISO yyyy-MM-dd and default to
 * "first of this month → today".
 *
 * Validate: no business rule is enforced here — every endpoint is read-only.
 * Access control is the only gate, and it lives in SecurityConfig
 * (UC-49..53 all require the Clinic Manager role).
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

    // ── Xuất Excel (CSV UTF-8) ──────────────────────────────────────────────
    @GetMapping("/revenue/export")
    public void exportRevenue(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            HttpServletResponse response) throws IOException {
        LocalDate[] range = defaultRange(from, to);
        reportService.exportRevenueXlsx(range[0], range[1], response);
    }

    @GetMapping("/patient-statistics/export")
    public void exportPatientStatistics(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            HttpServletResponse response) throws IOException {
        LocalDate[] range = defaultRange(from, to);
        reportService.exportPatientStatisticsXlsx(range[0], range[1], response);
    }

    @GetMapping("/feedback/export")
    public void exportFeedback(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            HttpServletResponse response) throws IOException {
        LocalDate[] range = defaultRange(from, to);
        reportService.exportFeedbackXlsx(range[0], range[1], response);
    }

    // Mặc định: từ đầu tháng hiện tại tới hôm nay
    private LocalDate[] defaultRange(LocalDate from, LocalDate to) {
        LocalDate today = LocalDate.now();
        LocalDate f = from != null ? from : today.withDayOfMonth(1);
        LocalDate t = to != null ? to : today;
        return new LocalDate[] { f, t };
    }
}
