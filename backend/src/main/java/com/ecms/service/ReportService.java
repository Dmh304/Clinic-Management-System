package com.ecms.service;

import jakarta.servlet.http.HttpServletResponse;

import java.io.IOException;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;

/**
 * UC-49/50/51/52/53: Báo cáo & phân tích cho Quản lý phòng khám.
 * Kết quả trả về dưới dạng Map/List<Map> để frontend hiển thị bảng + biểu đồ linh hoạt.
 */
public interface ReportService {

    /** UC-49: Dashboard vận hành thời gian thực (số liệu trong ngày). */
    Map<String, Object> operationalDashboard();

    /** UC-50: Báo cáo doanh thu theo kỳ, tách theo dịch vụ / bác sĩ / phương thức thanh toán. */
    Map<String, Object> revenueReport(LocalDate from, LocalDate to);

    /** UC-51: Thống kê bệnh nhân theo kỳ (lượt khám, mới/cũ, chẩn đoán, trạng thái lịch). */
    Map<String, Object> patientStatistics(LocalDate from, LocalDate to);

    /** UC-52: KPI hiệu suất nhân viên (bác sĩ) theo kỳ. */
    List<Map<String, Object>> staffPerformance(LocalDate from, LocalDate to);

    /** UC-53: Báo cáo tổng hợp đánh giá của bệnh nhân theo kỳ. */
    Map<String, Object> feedbackReport(LocalDate from, LocalDate to);

    // ── Xuất Excel (CSV UTF-8, mở trực tiếp bằng Excel) ──────────────────────
    /** UC-50: Xuất báo cáo doanh thu. */
    void exportRevenueCsv(LocalDate from, LocalDate to, HttpServletResponse response) throws IOException;

    /** UC-51: Xuất thống kê bệnh nhân. */
    void exportPatientStatisticsCsv(LocalDate from, LocalDate to, HttpServletResponse response) throws IOException;

    /** UC-53: Xuất báo cáo đánh giá. */
    void exportFeedbackCsv(LocalDate from, LocalDate to, HttpServletResponse response) throws IOException;
}
