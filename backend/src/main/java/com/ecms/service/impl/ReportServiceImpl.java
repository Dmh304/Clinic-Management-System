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
 * UC-49/50/51/52/53: Tổng hợp báo cáo & phân tích cho Quản lý.
 *
 * Cách tiếp cận: nạp dữ liệu theo khoảng thời gian rồi tổng hợp trong Java (quy
 * mô
 * phòng khám nhỏ nên chấp nhận được), tránh native query phụ thuộc dialect.
 *
 * Lưu ý trung thực: thời gian khám trung bình và tỉ lệ đúng giờ (UC-52) hiện
 * KHÔNG
 * tính được vì hệ thống chưa lưu mốc bắt đầu/kết thúc buổi khám — các trường
 * này để
 * null thay vì bịa số.
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
    @Override
    @Transactional(readOnly = true)
    public Map<String, Object> operationalDashboard() {
        LocalDate today = LocalDate.now();
        LocalDateTime start = today.atStartOfDay();
        LocalDateTime end = today.atTime(LocalTime.MAX);

        long total = appointmentRepository.countByDate(start, end);
        long completed = appointmentRepository.countByDateAndStatus(start, end, AppointmentStatus.COMPLETED);

        // Hàng đợi hôm nay theo từng bác sĩ: số đang chờ (WAITING) + đang khám
        // (IN_PROGRESS)
        Map<Long, long[]> agg = new LinkedHashMap<>(); // doctorId -> [waiting, inProgress]
        Map<Long, Doctor> doctorMap = new LinkedHashMap<>();
        long waitingTotal = 0;
        for (Appointment a : appointmentRepository.findByAppointmentTimeBetween(start, end)) {
            Doctor doc = a.getDoctor();
            if (doc == null)
                continue;
            doctorMap.putIfAbsent(doc.getId(), doc);
            long[] c = agg.computeIfAbsent(doc.getId(), k -> new long[2]);
            if (a.getStatus() == AppointmentStatus.WAITING) {
                c[0]++;
                waitingTotal++;
            } else if (a.getStatus() == AppointmentStatus.IN_PROGRESS)
                c[1]++;
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

        // Đơn thuốc chờ cấp phát (top 8) — cho panel Nhà thuốc
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
                    ? i.getAppointment().getDoctor().getFullName()
                    : "—";
            byDoctor.merge(doctorName, amount, BigDecimal::add);
        }

        Map<String, BigDecimal> byCategory = new LinkedHashMap<>();
        byCategory.put("SERVICE", serviceFee);
        byCategory.put("LAB", labFee);
        byCategory.put("MEDICINE", medicineFee);

        // Doanh thu trung bình mỗi hóa đơn
        BigDecimal avgPerInvoice = paid.isEmpty() ? BigDecimal.ZERO
                : totalRevenue.divide(BigDecimal.valueOf(paid.size()), 0, java.math.RoundingMode.HALF_UP);

        // Chi tiết hóa đơn đã thanh toán (top 30 theo tiền giảm dần)
        List<Map<String, Object>> paidInvoices = paid.stream()
                .sorted((a, b) -> nz(b.getTotalAmount()).compareTo(nz(a.getTotalAmount())))
                .limit(30)
                .map(i -> {
                    Map<String, Object> row = new LinkedHashMap<>();
                    row.put("code", i.getInvoiceCode());
                    row.put("doctorName", (i.getAppointment() != null && i.getAppointment().getDoctor() != null)
                            ? i.getAppointment().getDoctor().getFullName()
                            : "—");
                    row.put("paymentMethod", i.getPaymentMethod());
                    row.put("amount", nz(i.getTotalAmount()));
                    return row;
                }).toList();

        // Xu hướng doanh thu theo tháng trong năm của mốc "đến ngày"
        int year = to.getYear();
        int upToMonth = (year == LocalDate.now().getYear()) ? LocalDate.now().getMonthValue() : 12;
        long[] monthly = new long[13]; // 1..12
        for (Invoice i : invoiceRepository.findByPaymentStatusAndPaidAtBetween(
                "PAID", LocalDate.of(year, 1, 1).atStartOfDay(), LocalDate.of(year, 12, 31).atTime(LocalTime.MAX))) {
            if (i.getPaidAt() != null)
                monthly[i.getPaidAt().getMonthValue()] += nz(i.getTotalAmount()).longValue();
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

    // Trả về {name, amount} của khoản có doanh thu cao nhất trong map
    private Map<String, Object> topEntry(Map<String, BigDecimal> m) {
        String bestName = null;
        BigDecimal best = BigDecimal.valueOf(-1);
        for (Map.Entry<String, BigDecimal> e : m.entrySet()) {
            if (nz(e.getValue()).compareTo(best) > 0) {
                best = nz(e.getValue());
                bestName = e.getKey();
            }
        }
        Map<String, Object> r = new LinkedHashMap<>();
        r.put("name", bestName);
        r.put("amount", bestName == null ? BigDecimal.ZERO : best);
        return r;
    }

    // ─────────────────────────────── UC-51 ───────────────────────────────
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
            if (isNew)
                newPatients++;
            else
                returningPatients++;
        }

        // Top 5 chẩn đoán theo hồ sơ bệnh án tạo trong kỳ
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
    @Override
    @Transactional(readOnly = true)
    public List<Map<String, Object>> staffPerformance(LocalDate from, LocalDate to) {
        LocalDateTime start = from.atStartOfDay();
        LocalDateTime end = to.atTime(LocalTime.MAX);

        List<Appointment> appts = appointmentRepository.findByAppointmentTimeBetween(start, end);
        List<Prescription> prescriptions = prescriptionRepository.findByCreatedAtBetween(start, end);
        List<MedicalRecord> records = medicalRecordRepository.findByCreatedAtBetween(start, end);

        // Đếm số bệnh nhân đã khám (lịch COMPLETED) + tỉ lệ đúng giờ theo bác sĩ.
        // Đúng giờ = có check-in và giờ check-in không trễ hơn giờ hẹn.
        Map<Long, Long> seenByDoctor = new LinkedHashMap<>();
        Map<Long, long[]> onTimeByDoctor = new LinkedHashMap<>(); // [đúng giờ, tổng có check-in]
        for (Appointment a : appts) {
            if (a.getStatus() != AppointmentStatus.COMPLETED || a.getDoctor() == null)
                continue;
            Long did = a.getDoctor().getId();
            seenByDoctor.merge(did, 1L, Long::sum);
            if (a.getCheckInTime() != null && a.getAppointmentTime() != null) {
                long[] agg = onTimeByDoctor.computeIfAbsent(did, k -> new long[2]);
                agg[1] += 1;
                if (!a.getCheckInTime().isAfter(a.getAppointmentTime()))
                    agg[0] += 1;
            }
        }

        // Đếm số đơn thuốc theo bác sĩ (qua hồ sơ bệnh án)
        Map<Long, Long> presByDoctor = new LinkedHashMap<>();
        for (Prescription p : prescriptions) {
            if (p.getMedicalRecord() != null && p.getMedicalRecord().getDoctor() != null) {
                presByDoctor.merge(p.getMedicalRecord().getDoctor().getId(), 1L, Long::sum);
            }
        }

        // Thời gian khám trung bình theo bác sĩ = trung bình (lockedAt − createdAt) của
        // các
        // bệnh án đã hoàn tất trong kỳ (lockedAt là mốc bác sĩ khóa hồ sơ khi kết thúc
        // khám).
        Map<Long, long[]> durByDoctor = new LinkedHashMap<>(); // [tổng phút, số ca]
        for (MedicalRecord mr : records) {
            if (mr.getStatus() != MedicalRecordStatus.COMPLETED || mr.getDoctor() == null)
                continue;
            LocalDateTime endTs = mr.getLockedAt() != null ? mr.getLockedAt() : mr.getUpdatedAt();
            if (mr.getCreatedAt() == null || endTs == null)
                continue;
            long minutes = Duration.between(mr.getCreatedAt(), endTs).toMinutes();
            if (minutes < 0)
                continue;
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
                    ? Math.round((double) dur[0] / dur[1])
                    : null);

            long[] ot = onTimeByDoctor.get(d.getId());
            row.put("onTimeRate", ot != null && ot[1] > 0
                    ? (double) ot[0] / ot[1]
                    : null);

            result.add(row);
        }
        return result;
    }

    // ─────────────────────────────── UC-53 ───────────────────────────────
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

        // Tỉ lệ phản hồi = số feedback / số lịch hẹn đã hoàn thành trong kỳ
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

    private static BigDecimal nz(BigDecimal v) {
        return v != null ? v : BigDecimal.ZERO;
    }

    // ─────────────────────────── Xuất Excel (CSV UTF-8)
    // ───────────────────────────

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
    public void exportPatientStatisticsCsv(LocalDate from, LocalDate to, HttpServletResponse response)
            throws IOException {
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

    // Ghi CSV UTF-8 kèm BOM để Excel mở đúng tiếng Việt.
    private void writeCsv(HttpServletResponse response, String filename, List<String[]> rows) throws IOException {
        response.setContentType("text/csv; charset=UTF-8");
        response.setHeader("Content-Disposition", "attachment; filename=" + filename);
        PrintWriter w = response.getWriter();
        w.write('﻿'); // BOM để Excel nhận UTF-8
        for (String[] row : rows) {
            StringBuilder sb = new StringBuilder();
            for (int i = 0; i < row.length; i++) {
                if (i > 0)
                    sb.append(',');
                sb.append(csvCell(row[i]));
            }
            sb.append("\r\n");
            w.write(sb.toString());
        }
        w.flush();
    }

    private String csvCell(String v) {
        if (v == null)
            return "";
        String s = v.replace("\"", "\"\"");
        if (s.contains(",") || s.contains("\"") || s.contains("\n") || s.contains("\r")) {
            s = "\"" + s + "\"";
        }
        return s;
    }
}
