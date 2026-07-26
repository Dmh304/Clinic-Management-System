package com.ecms.service.impl;

import com.ecms.entity.Appointment;
import com.ecms.entity.AppointmentStatus;
import com.ecms.entity.Doctor;
import com.ecms.entity.Feedback;
import com.ecms.entity.Invoice;
import com.ecms.entity.LabOrderStatus;
import com.ecms.entity.MedicalRecord;
import com.ecms.entity.MedicalRecordStatus;
import com.ecms.entity.Patient;
import com.ecms.entity.Prescription;
import com.ecms.entity.PrescriptionStatus;
import com.ecms.repository.AppointmentRepository;
import com.ecms.repository.DoctorRepository;
import com.ecms.repository.FeedbackRepository;
import com.ecms.repository.InvoiceRepository;
import com.ecms.repository.LabOrderRepository;
import com.ecms.repository.MedicalRecordRepository;
import com.ecms.repository.PrescriptionRepository;
import com.ecms.service.ReportService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import jakarta.servlet.http.HttpServletResponse;

import java.io.IOException;
import java.io.PrintWriter;
import java.math.BigDecimal;
import java.time.Duration;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * @author      ThangNB - HE201024
 * @contributor Đồng Mạnh Hùng - HE200743
 * @created     2026-07-19
 * @updated     2026-07-20
 *
 * Aggregates every Clinic Manager report: UC-49 (operational dashboard),
 * UC-50 (revenue), UC-51 (patient statistics), UC-52 (staff performance) and
 * UC-53 (feedback).
 *
 * Approach: load the rows for the period and aggregate in Java rather than in
 * SQL. At clinic scale the volume is small, and it keeps the module free of
 * dialect-specific native queries.
 *
 * On UC-52 metrics: average consultation time is derived from
 * {@code lockedAt − createdAt} on completed EMRs (the doctor locking the
 * record is the closest thing to a visit end timestamp), and the on-time rate
 * from check-in time versus scheduled time. Both are approximations of the
 * "average consultation time" and "on-time start rate" KPIs in UC-52, since
 * the system records no explicit consultation start/end.
 *
 * Read-only throughout — no business rule is mutated here.
 */
@Service
@RequiredArgsConstructor
public class ReportServiceImpl implements ReportService {

    private final InvoiceRepository invoiceRepository;
    private final AppointmentRepository appointmentRepository;
    private final MedicalRecordRepository medicalRecordRepository;
    private final PrescriptionRepository prescriptionRepository;
    private final LabOrderRepository labOrderRepository;
    private final FeedbackRepository feedbackRepository;
    private final DoctorRepository doctorRepository;

    // ─────────────────────────────── UC-49 ───────────────────────────────

    /**
     * Builds today's live operational snapshot (UC-49 normal flow step 2):
     * appointments booked vs completed, waiting queue per doctor, prescriptions
     * awaiting dispensing, outstanding invoices and lab orders in progress.
     *
     * Always scoped to the current day — the dashboard is a "right now" view,
     * which is why it takes no date range.
     *
     * @return widget values keyed by metric name
     */
    @Override
    @Transactional(readOnly = true)
    public Map<String, Object> operationalDashboard() {
        LocalDate today = LocalDate.now();
        LocalDateTime start = today.atStartOfDay();
        LocalDateTime end = today.atTime(LocalTime.MAX);

        long total = appointmentRepository.countByDate(start, end);
        long completed = appointmentRepository.countByDateAndStatus(start, end, AppointmentStatus.COMPLETED);

        // Per-doctor queue for today: WAITING plus IN_PROGRESS (UC-49 "queue lengths per doctor")
        Map<Long, long[]> agg = new LinkedHashMap<>();      // doctorId -> [waiting, inProgress]
        Map<Long, Doctor> doctorMap = new LinkedHashMap<>();
        long waitingTotal = 0;
        for (Appointment a : appointmentRepository.findByAppointmentTimeBetween(start, end)) {
            Doctor doc = a.getDoctor();
            if (doc == null) continue;
            doctorMap.putIfAbsent(doc.getId(), doc);
            long[] c = agg.computeIfAbsent(doc.getId(), k -> new long[2]);
            if (a.getStatus() == AppointmentStatus.WAITING) { c[0]++; waitingTotal++; }
            else if (a.getStatus() == AppointmentStatus.IN_PROGRESS) c[1]++;
        }
        List<Map<String, Object>> doctorQueue = new ArrayList<>();
        for (Map.Entry<Long, Doctor> e : doctorMap.entrySet()) {
            long[] c = agg.get(e.getKey());
            String status = c[1] > 0 ? "Đang khám" : (c[0] > 0 ? "Sẵn sàng" : "Tạm nghỉ");
            Map<String, Object> row = new LinkedHashMap<>();
            row.put("doctorName", e.getValue().getFullName());
            row.put("specialty", e.getValue().getSpecialization());
            row.put("status", status);
            row.put("waiting", c[0]);
            row.put("inProgress", c[1]);
            doctorQueue.add(row);
        }

        // Prescriptions awaiting dispensing, capped at 8 for the pharmacy panel
        List<Map<String, Object>> pendingList = new ArrayList<>();
        List<Prescription> pending = prescriptionRepository.findByStatusOrderByCreatedAtAsc(PrescriptionStatus.PENDING);
        for (Prescription p : pending.stream().limit(8).toList()) {
            Map<String, Object> row = new LinkedHashMap<>();
            row.put("code", "RX-" + p.getId());
            row.put("patientName", p.getPatient() != null ? p.getPatient().getFullName() : null);
            row.put("doctorName", p.getDoctor() != null ? p.getDoctor().getFullName() : null);
            row.put("itemCount", p.getItems() != null ? p.getItems().size() : 0);
            row.put("createdAt", p.getCreatedAt());
            pendingList.add(row);
        }

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("todayTotalAppointments", total);
        result.put("todayCompletedAppointments", completed);
        result.put("progressPercent", total > 0 ? Math.round(completed * 1000.0 / total) / 10.0 : 0.0);
        result.put("waitingPatientsTotal", waitingTotal);
        result.put("doctorQueue", doctorQueue);
        result.put("pendingPrescriptions", prescriptionRepository.countByStatus(PrescriptionStatus.PENDING));
        result.put("pendingPrescriptionList", pendingList);
        result.put("outstandingInvoices", invoiceRepository.countOutstanding());
        result.put("outstandingInvoiceAmount", invoiceRepository.sumOutstanding());
        result.put("labOrdersInProgress", labOrderRepository.countByStatus(LabOrderStatus.IN_PROGRESS));
        return result;
    }

    // ─────────────────────────────── UC-50 ───────────────────────────────

    /**
     * Revenue over a period, split by service category, doctor and payment
     * method, plus a monthly trend for the year of {@code to}
     * (UC-50 normal flow steps 3-4).
     *
     * Only PAID invoices count, matched on {@code paidAt}, so revenue is
     * recognised on the day the money arrived (BR-10: an invoice is PAID only
     * once fully settled, which is what makes this figure trustworthy).
     *
     * @param from period start, inclusive
     * @param to   period end, inclusive
     * @return totals and per-dimension breakdowns
     */
    @Override
    @Transactional(readOnly = true)
    public Map<String, Object> revenueReport(LocalDate from, LocalDate to) {
        LocalDateTime start = from.atStartOfDay();
        LocalDateTime end = to.atTime(LocalTime.MAX);

        List<Invoice> paid = invoiceRepository.findByPaymentStatusAndPaidAtBetween("PAID", start, end);

        BigDecimal totalRevenue = BigDecimal.ZERO;
        BigDecimal serviceFee = BigDecimal.ZERO;
        BigDecimal labFee = BigDecimal.ZERO;
        BigDecimal medicineFee = BigDecimal.ZERO;
        Map<String, BigDecimal> byMethod = new LinkedHashMap<>();
        Map<String, BigDecimal> byDoctor = new LinkedHashMap<>();

        for (Invoice i : paid) {
            BigDecimal amount = nz(i.getTotalAmount());
            totalRevenue = totalRevenue.add(amount);
            serviceFee = serviceFee.add(nz(i.getServiceFee()));
            labFee = labFee.add(nz(i.getLabFee()));
            medicineFee = medicineFee.add(nz(i.getMedicineFee()));

            String method = i.getPaymentMethod() != null ? i.getPaymentMethod() : "UNKNOWN";
            byMethod.merge(method, amount, BigDecimal::add);

            String doctorName = (i.getAppointment() != null && i.getAppointment().getDoctor() != null)
                    ? i.getAppointment().getDoctor().getFullName() : "—";
            byDoctor.merge(doctorName, amount, BigDecimal::add);
        }

        Map<String, BigDecimal> byCategory = new LinkedHashMap<>();
        byCategory.put("SERVICE", serviceFee);
        byCategory.put("LAB", labFee);
        byCategory.put("MEDICINE", medicineFee);

        // Average revenue per invoice
        BigDecimal avgPerInvoice = paid.isEmpty() ? BigDecimal.ZERO
                : totalRevenue.divide(BigDecimal.valueOf(paid.size()), 0, java.math.RoundingMode.HALF_UP);

        // Paid-invoice detail, top 30 by amount descending
        List<Map<String, Object>> paidInvoices = paid.stream()
                .sorted((a, b) -> nz(b.getTotalAmount()).compareTo(nz(a.getTotalAmount())))
                .limit(30)
                .map(i -> {
                    Map<String, Object> row = new LinkedHashMap<>();
                    row.put("code", i.getInvoiceCode());
                    row.put("doctorName", (i.getAppointment() != null && i.getAppointment().getDoctor() != null)
                            ? i.getAppointment().getDoctor().getFullName() : "—");
                    row.put("paymentMethod", i.getPaymentMethod());
                    row.put("amount", nz(i.getTotalAmount()));
                    return row;
                }).toList();

        // Monthly revenue trend across the year that the "to" date falls in
        int year = to.getYear();
        int upToMonth = (year == LocalDate.now().getYear()) ? LocalDate.now().getMonthValue() : 12;
        long[] monthly = new long[13]; // 1..12
        for (Invoice i : invoiceRepository.findByPaymentStatusAndPaidAtBetween(
                "PAID", LocalDate.of(year, 1, 1).atStartOfDay(), LocalDate.of(year, 12, 31).atTime(LocalTime.MAX))) {
            if (i.getPaidAt() != null) monthly[i.getPaidAt().getMonthValue()] += nz(i.getTotalAmount()).longValue();
        }
        List<Map<String, Object>> monthlyTrend = new ArrayList<>();
        for (int mth = 1; mth <= upToMonth; mth++) {
            Map<String, Object> row = new LinkedHashMap<>();
            row.put("month", mth);
            row.put("revenue", monthly[mth]);
            monthlyTrend.add(row);
        }

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("from", from);
        result.put("to", to);
        result.put("invoiceCount", paid.size());
        result.put("totalRevenue", totalRevenue);
        result.put("averagePerInvoice", avgPerInvoice);
        result.put("topServiceCategory", topEntry(byCategory));
        result.put("topDoctor", topEntry(byDoctor));
        result.put("byServiceCategory", byCategory);
        result.put("byDoctor", byDoctor);
        result.put("byPaymentMethod", byMethod);
        result.put("monthlyTrend", monthlyTrend);
        result.put("paidInvoices", paidInvoices);
        result.put("year", year);
        return result;
    }

    /**
     * Picks the highest-earning entry of a breakdown map.
     *
     * @param m breakdown keyed by category / doctor name
     * @return {@code {name, amount}}; name is null and amount zero on an empty map
     */
    private Map<String, Object> topEntry(Map<String, BigDecimal> m) {
        String bestName = null;
        BigDecimal best = BigDecimal.valueOf(-1);
        for (Map.Entry<String, BigDecimal> e : m.entrySet()) {
            if (nz(e.getValue()).compareTo(best) > 0) { best = nz(e.getValue()); bestName = e.getKey(); }
        }
        Map<String, Object> r = new LinkedHashMap<>();
        r.put("name", bestName);
        r.put("amount", bestName == null ? BigDecimal.ZERO : best);
        return r;
    }

    // ─────────────────────────────── UC-51 ───────────────────────────────

    /**
     * Patient volume analytics for a period (UC-51 normal flow step 3):
     * appointments by status, distinct patients, new vs returning, top
     * diagnoses and appointments per doctor.
     *
     * "New" means the patient has no appointment before the window start, so
     * the same patient can be new in one period and returning in the next.
     *
     * @param from period start, inclusive
     * @param to   period end, inclusive
     * @return statistics keyed by metric name
     */
    @Override
    @Transactional(readOnly = true)
    public Map<String, Object> patientStatistics(LocalDate from, LocalDate to) {
        LocalDateTime start = from.atStartOfDay();
        LocalDateTime end = to.atTime(LocalTime.MAX);

        List<Appointment> appts = appointmentRepository.findByAppointmentTimeBetween(start, end);

        Map<String, Long> byStatus = new LinkedHashMap<>();
        Map<String, Long> perDoctor = new LinkedHashMap<>();
        Map<Long, Patient> distinctPatients = new LinkedHashMap<>();
        for (Appointment a : appts) {
            if (a.getStatus() != null) {
                byStatus.merge(a.getStatus().name(), 1L, Long::sum);
            }
            if (a.getDoctor() != null) {
                perDoctor.merge(a.getDoctor().getFullName(), 1L, Long::sum);
            }
            if (a.getPatient() != null) {
                distinctPatients.putIfAbsent(a.getPatient().getId(), a.getPatient());
            }
        }

        long newPatients = 0;
        long returningPatients = 0;
        for (Patient p : distinctPatients.values()) {
            boolean isNew = p.getCreatedAt() != null && !p.getCreatedAt().isBefore(start);
            if (isNew) newPatients++;
            else returningPatients++;
        }

        // UC-51: top 5 diagnoses across EMRs created in the period
        Map<String, Long> diagnosisCount = new LinkedHashMap<>();
        for (MedicalRecord mr : medicalRecordRepository.findByCreatedAtBetween(start, end)) {
            String dx = mr.getDiagnosis();
            if (dx != null && !dx.isBlank()) {
                diagnosisCount.merge(dx.trim(), 1L, Long::sum);
            }
        }
        List<Map<String, Object>> topDiagnoses = diagnosisCount.entrySet().stream()
                .sorted((a, b) -> Long.compare(b.getValue(), a.getValue()))
                .limit(5)
                .map(e -> {
                    Map<String, Object> m = new LinkedHashMap<>();
                    m.put("diagnosis", e.getKey());
                    m.put("count", e.getValue());
                    return m;
                })
                .toList();

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("from", from);
        result.put("to", to);
        result.put("totalAppointments", (long) appts.size());
        result.put("distinctPatients", (long) distinctPatients.size());
        result.put("newPatients", newPatients);
        result.put("returningPatients", returningPatients);
        result.put("appointmentsByStatus", byStatus);
        result.put("appointmentsByDoctor", perDoctor);
        result.put("topDiagnoses", topDiagnoses);
        return result;
    }

    // ─────────────────────────────── UC-52 ───────────────────────────────

    /**
     * Per-doctor KPIs for a period (UC-52 normal flow steps 3-4): patients
     * seen, on-time rate, prescription volume and average consultation time.
     *
     * See the class comment on how the two time-based KPIs are approximated —
     * the schema has no explicit consultation start/end timestamps.
     *
     * @param from period start, inclusive
     * @param to   period end, inclusive
     * @return one row per doctor
     */
    @Override
    @Transactional(readOnly = true)
    public List<Map<String, Object>> staffPerformance(LocalDate from, LocalDate to) {
        LocalDateTime start = from.atStartOfDay();
        LocalDateTime end = to.atTime(LocalTime.MAX);

        List<Appointment> appts = appointmentRepository.findByAppointmentTimeBetween(start, end);
        List<Prescription> prescriptions = prescriptionRepository.findByCreatedAtBetween(start, end);
        List<MedicalRecord> records = medicalRecordRepository.findByCreatedAtBetween(start, end);

        // Patients seen (COMPLETED appointments) and on-time rate per doctor.
        // On time = the patient checked in and did so no later than the
        // scheduled time. Appointments with no check-in are excluded from the
        // denominator rather than counted as late, so walk-in flows that skip
        // check-in do not distort the KPI.
        Map<Long, Long> seenByDoctor = new LinkedHashMap<>();
        Map<Long, long[]> onTimeByDoctor = new LinkedHashMap<>(); // [đúng giờ, tổng có check-in]
        for (Appointment a : appts) {
            if (a.getStatus() != AppointmentStatus.COMPLETED || a.getDoctor() == null) continue;
            Long did = a.getDoctor().getId();
            seenByDoctor.merge(did, 1L, Long::sum);
            if (a.getCheckInTime() != null && a.getAppointmentTime() != null) {
                long[] agg = onTimeByDoctor.computeIfAbsent(did, k -> new long[2]);
                agg[1] += 1;
                if (!a.getCheckInTime().isAfter(a.getAppointmentTime())) agg[0] += 1;
            }
        }

        // Prescription volume per doctor, reached through the EMR
        Map<Long, Long> presByDoctor = new LinkedHashMap<>();
        for (Prescription p : prescriptions) {
            if (p.getMedicalRecord() != null && p.getMedicalRecord().getDoctor() != null) {
                presByDoctor.merge(p.getMedicalRecord().getDoctor().getId(), 1L, Long::sum);
            }
        }

        // Average consultation time per doctor = mean of (lockedAt − createdAt)
        // over EMRs completed in the period. lockedAt is when the doctor locked
        // the record at the end of the visit (UC-27c), the closest available
        // proxy for a consultation end timestamp.
        Map<Long, long[]> durByDoctor = new LinkedHashMap<>(); // [tổng phút, số ca]
        for (MedicalRecord mr : records) {
            if (mr.getStatus() != MedicalRecordStatus.COMPLETED || mr.getDoctor() == null) continue;
            LocalDateTime endTs = mr.getLockedAt() != null ? mr.getLockedAt() : mr.getUpdatedAt();
            if (mr.getCreatedAt() == null || endTs == null) continue;
            long minutes = Duration.between(mr.getCreatedAt(), endTs).toMinutes();
            if (minutes < 0) continue;
            long[] agg = durByDoctor.computeIfAbsent(mr.getDoctor().getId(), k -> new long[2]);
            agg[0] += minutes;
            agg[1] += 1;
        }

        List<Map<String, Object>> result = new ArrayList<>();
        for (Doctor d : doctorRepository.findAll()) {
            Map<String, Object> row = new LinkedHashMap<>();
            row.put("doctorId", d.getId());
            row.put("doctorName", d.getFullName());
            row.put("patientsSeen", seenByDoctor.getOrDefault(d.getId(), 0L));
            row.put("prescriptionVolume", presByDoctor.getOrDefault(d.getId(), 0L));

            long[] dur = durByDoctor.get(d.getId());
            row.put("avgConsultationMinutes", dur != null && dur[1] > 0
                    ? Math.round((double) dur[0] / dur[1]) : null);

            long[] ot = onTimeByDoctor.get(d.getId());
            row.put("onTimeRate", ot != null && ot[1] > 0
                    ? (double) ot[0] / ot[1] : null);

            result.add(row);
        }
        return result;
    }

    // ─────────────────────────────── UC-53 ───────────────────────────────

    /**
     * Aggregated patient feedback for a period (UC-53 normal flow step 4):
     * average rating per doctor, total responses and response rate.
     *
     * @param from period start, inclusive
     * @param to   period end, inclusive
     * @return feedback analytics keyed by metric name
     */
    @Override
    @Transactional(readOnly = true)
    public Map<String, Object> feedbackReport(LocalDate from, LocalDate to) {
        LocalDateTime start = from.atStartOfDay();
        LocalDateTime end = to.atTime(LocalTime.MAX);

        List<Feedback> feedbacks = feedbackRepository.findByCreatedAtBetween(start, end);

        long totalResponses = feedbacks.size();
        long sumRating = 0;
        Map<String, long[]> perDoctorAgg = new LinkedHashMap<>(); // name -> [sum, count]
        for (Feedback f : feedbacks) {
            int r = f.getRating() != null ? f.getRating() : 0;
            sumRating += r;
            String doctorName = f.getDoctor() != null ? f.getDoctor().getFullName() : "—";
            long[] agg = perDoctorAgg.computeIfAbsent(doctorName, k -> new long[2]);
            agg[0] += r;
            agg[1] += 1;
        }

        double averageRating = totalResponses > 0 ? (double) sumRating / totalResponses : 0.0;

        List<Map<String, Object>> perDoctor = new ArrayList<>();
        for (Map.Entry<String, long[]> e : perDoctorAgg.entrySet()) {
            long[] agg = e.getValue();
            Map<String, Object> row = new LinkedHashMap<>();
            row.put("doctorName", e.getKey());
            row.put("responses", agg[1]);
            row.put("averageRating", agg[1] > 0 ? (double) agg[0] / agg[1] : 0.0);
            perDoctor.add(row);
        }

        // Response rate = feedback count / completed appointments in the period.
        // BR-21 caps feedback at one per appointment, which is what keeps this
        // ratio bounded at 100% and meaningful as a percentage.
        long completed = appointmentRepository.countByDateAndStatus(start, end, AppointmentStatus.COMPLETED);
        double responseRate = completed > 0 ? (double) totalResponses / completed : 0.0;

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("from", from);
        result.put("to", to);
        result.put("totalResponses", totalResponses);
        result.put("averageRating", averageRating);
        result.put("completedAppointments", completed);
        result.put("responseRate", responseRate);
        result.put("byDoctor", perDoctor);
        return result;
    }

    /**
     * Null-safe amount, so a missing fee contributes 0 to a sum instead of
     * producing a NullPointerException mid-aggregation.
     *
     * @param v amount, may be null
     * @return {@code v}, or {@code BigDecimal.ZERO}
     */
    private static BigDecimal nz(BigDecimal v) {
        return v != null ? v : BigDecimal.ZERO;
    }

    // ─────────────────────────── Exports (UTF-8 CSV) ───────────────────────────
    // Note: UC-50 step 6 specifies a real .xlsx download; these endpoints emit
    // CSV that Excel opens natively, which is a deviation from the SRS.

    /**
     * Streams the revenue report as CSV (UC-50 steps 5-6).
     * Re-runs {@link #revenueReport} so the export always matches the figures
     * currently on screen for the same date range.
     *
     * @param from     period start, inclusive
     * @param to       period end, inclusive
     * @param response servlet response the CSV is written to
     * @throws IOException if the response stream fails
     */
    @Override
    @Transactional(readOnly = true)
    @SuppressWarnings("unchecked")
    public void exportRevenueCsv(LocalDate from, LocalDate to, HttpServletResponse response) throws IOException {
        Map<String, Object> r = revenueReport(from, to);
        List<String[]> rows = new ArrayList<>();
        rows.add(new String[] { "Bao cao doanh thu", from + " -> " + to });
        rows.add(new String[] { "Tong doanh thu", String.valueOf(r.get("totalRevenue")) });
        rows.add(new String[] { "So hoa don", String.valueOf(r.get("invoiceCount")) });
        rows.add(new String[] {});
        rows.add(new String[] { "Theo nhom dich vu", "Doanh thu" });
        ((Map<String, Object>) r.get("byServiceCategory"))
                .forEach((k, v) -> rows.add(new String[] { k, String.valueOf(v) }));
        rows.add(new String[] {});
        rows.add(new String[] { "Theo bac si", "Doanh thu" });
        ((Map<String, Object>) r.get("byDoctor"))
                .forEach((k, v) -> rows.add(new String[] { k, String.valueOf(v) }));
        rows.add(new String[] {});
        rows.add(new String[] { "Theo phuong thuc thanh toan", "Doanh thu" });
        ((Map<String, Object>) r.get("byPaymentMethod"))
                .forEach((k, v) -> rows.add(new String[] { k, String.valueOf(v) }));
        writeCsv(response, "revenue-report.csv", rows);
    }

    @Override
    @Transactional(readOnly = true)
    @SuppressWarnings("unchecked")
    /**
     * Streams the patient statistics as CSV (UC-51 step 4).
     *
     * @param from     period start, inclusive
     * @param to       period end, inclusive
     * @param response servlet response the CSV is written to
     * @throws IOException if the response stream fails
     */
    public void exportPatientStatisticsCsv(LocalDate from, LocalDate to, HttpServletResponse response) throws IOException {
        Map<String, Object> r = patientStatistics(from, to);
        List<String[]> rows = new ArrayList<>();
        rows.add(new String[] { "Thong ke benh nhan", from + " -> " + to });
        rows.add(new String[] { "Tong luot kham", String.valueOf(r.get("totalAppointments")) });
        rows.add(new String[] { "So benh nhan", String.valueOf(r.get("distinctPatients")) });
        rows.add(new String[] { "Benh nhan moi", String.valueOf(r.get("newPatients")) });
        rows.add(new String[] { "Benh nhan cu", String.valueOf(r.get("returningPatients")) });
        rows.add(new String[] {});
        rows.add(new String[] { "Lich hen theo trang thai", "So luong" });
        ((Map<String, Object>) r.get("appointmentsByStatus"))
                .forEach((k, v) -> rows.add(new String[] { k, String.valueOf(v) }));
        rows.add(new String[] {});
        rows.add(new String[] { "Lich hen theo bac si", "So luong" });
        ((Map<String, Object>) r.get("appointmentsByDoctor"))
                .forEach((k, v) -> rows.add(new String[] { k, String.valueOf(v) }));
        rows.add(new String[] {});
        rows.add(new String[] { "Top chan doan", "So ca" });
        for (Map<String, Object> d : (List<Map<String, Object>>) r.get("topDiagnoses")) {
            rows.add(new String[] { String.valueOf(d.get("diagnosis")), String.valueOf(d.get("count")) });
        }
        writeCsv(response, "patient-statistics.csv", rows);
    }

    @Override
    @Transactional(readOnly = true)
    @SuppressWarnings("unchecked")
    /**
     * Streams the feedback report as CSV (UC-53 step 5).
     *
     * @param from     period start, inclusive
     * @param to       period end, inclusive
     * @param response servlet response the CSV is written to
     * @throws IOException if the response stream fails
     */
    public void exportFeedbackCsv(LocalDate from, LocalDate to, HttpServletResponse response) throws IOException {
        Map<String, Object> r = feedbackReport(from, to);
        List<String[]> rows = new ArrayList<>();
        rows.add(new String[] { "Bao cao danh gia", from + " -> " + to });
        rows.add(new String[] { "Diem trung binh", String.valueOf(r.get("averageRating")) });
        rows.add(new String[] { "So phan hoi", String.valueOf(r.get("totalResponses")) });
        rows.add(new String[] { "Ti le phan hoi", String.valueOf(r.get("responseRate")) });
        rows.add(new String[] {});
        rows.add(new String[] { "Bac si", "So phan hoi", "Diem TB" });
        for (Map<String, Object> row : (List<Map<String, Object>>) r.get("byDoctor")) {
            rows.add(new String[] { String.valueOf(row.get("doctorName")),
                    String.valueOf(row.get("responses")), String.valueOf(row.get("averageRating")) });
        }
        writeCsv(response, "feedback-report.csv", rows);
    }

    /**
     * Writes rows to the response as UTF-8 CSV.
     *
     * A UTF-8 BOM is prepended deliberately: without it Excel decodes the file
     * as the local ANSI codepage and every Vietnamese character is mangled.
     *
     * @param response servlet response to stream into
     * @param filename download filename offered to the browser
     * @param rows     CSV rows, one String[] per line
     * @throws IOException if the response stream fails
     */
    private void writeCsv(HttpServletResponse response, String filename, List<String[]> rows) throws IOException {
        response.setContentType("text/csv; charset=UTF-8");
        response.setHeader("Content-Disposition", "attachment; filename=" + filename);
        PrintWriter w = response.getWriter();
        w.write('﻿'); // BOM để Excel nhận UTF-8
        for (String[] row : rows) {
            StringBuilder sb = new StringBuilder();
            for (int i = 0; i < row.length; i++) {
                if (i > 0) sb.append(',');
                sb.append(csvCell(row[i]));
            }
            sb.append("\r\n");
            w.write(sb.toString());
        }
        w.flush();
    }

    /**
     * Escapes one CSV cell per RFC 4180.
     *
     * Validate: a value containing a comma, quote or newline must be quoted
     * and its inner quotes doubled — otherwise a patient name or a free-text
     * feedback comment would shift every following column.
     *
     * @param v raw cell value, may be null
     * @return the escaped cell, empty string for null
     */
    private String csvCell(String v) {
        if (v == null) return "";
        String s = v.replace("\"", "\"\"");
        if (s.contains(",") || s.contains("\"") || s.contains("\n") || s.contains("\r")) {
            s = "\"" + s + "\"";
        }
        return s;
    }
}
