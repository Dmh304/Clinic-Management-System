package com.ecms.service;

import jakarta.servlet.http.HttpServletResponse;

import java.io.IOException;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;

/**
 * @author      ThangNB - HE201024
 * @contributor Đồng Mạnh Hùng - HE200743
 * @created     2026-05-31
 * @updated     2026-07-19
 *
 * Reporting and analytics contract for the Clinic Manager
 * (UC-49, UC-50, UC-51, UC-52, UC-53).
 *
 * Results are returned as {@code Map} / {@code List<Map>} rather than fixed
 * DTOs so the frontend can render tables and charts off the same payload
 * without a new type per widget.
 *
 * Every method is read-only and enforces no business rule; access is gated by
 * role in SecurityConfig.
 */
public interface ReportService {

    /**
     * UC-49: live operational figures for today — appointment progress, queue
     * length per doctor, pending prescriptions, outstanding invoices and lab
     * orders in progress.
     *
     * @return dashboard widgets keyed by metric name
     */
    Map<String, Object> operationalDashboard();

    /**
     * UC-50: revenue over a period, broken down by service category, doctor
     * and payment method.
     *
     * Counts PAID invoices by {@code paidAt}, so revenue lands on the day the
     * money arrived rather than the day the invoice was raised.
     *
     * @param from period start, inclusive
     * @param to   period end, inclusive
     * @return totals plus the per-dimension breakdowns
     */
    Map<String, Object> revenueReport(LocalDate from, LocalDate to);

    /**
     * UC-51: patient volume over a period — visits, new vs returning patients,
     * top diagnoses and appointment status distribution.
     *
     * @param from period start, inclusive
     * @param to   period end, inclusive
     * @return statistics keyed by metric name
     */
    Map<String, Object> patientStatistics(LocalDate from, LocalDate to);

    /**
     * UC-52: per-doctor KPIs over a period — patients seen, average
     * consultation duration and prescription volume.
     *
     * @param from period start, inclusive
     * @param to   period end, inclusive
     * @return one row per staff member
     */
    List<Map<String, Object>> staffPerformance(LocalDate from, LocalDate to);

    /**
     * UC-53: aggregated patient feedback over a period — average rating per
     * doctor, response counts and common themes.
     *
     * @param from period start, inclusive
     * @param to   period end, inclusive
     * @return feedback analytics keyed by metric name
     */
    Map<String, Object> feedbackReport(LocalDate from, LocalDate to);

    // ── Exports ───────────────────────────────────────────────────────────────
    // Emitted as UTF-8 CSV, which Excel opens directly. Note this is a
    // deviation from UC-50 step 6, which specifies a real .xlsx file.

    /**
     * UC-50 step 5-6: exports the revenue report.
     *
     * @param from     period start, inclusive
     * @param to       period end, inclusive
     * @param response servlet response the CSV is streamed to
     * @throws IOException if the response stream fails
     */
    void exportRevenueCsv(LocalDate from, LocalDate to, HttpServletResponse response) throws IOException;

    /**
     * UC-51 step 4: exports the patient statistics.
     *
     * @param from     period start, inclusive
     * @param to       period end, inclusive
     * @param response servlet response the CSV is streamed to
     * @throws IOException if the response stream fails
     */
    void exportPatientStatisticsCsv(LocalDate from, LocalDate to, HttpServletResponse response) throws IOException;

    /**
     * UC-53 step 5: exports the detailed feedback list.
     *
     * @param from     period start, inclusive
     * @param to       period end, inclusive
     * @param response servlet response the CSV is streamed to
     * @throws IOException if the response stream fails
     */
    void exportFeedbackCsv(LocalDate from, LocalDate to, HttpServletResponse response) throws IOException;
}
