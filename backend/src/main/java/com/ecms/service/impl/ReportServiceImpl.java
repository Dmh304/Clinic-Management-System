package com.ecms.service.impl;

import com.ecms.entity.Appointment;
import com.ecms.entity.AppointmentStatus;
import com.ecms.entity.Doctor;
import com.ecms.entity.Feedback;
import com.ecms.entity.Invoice;
import com.ecms.entity.LabOrderStatus;
import com.ecms.entity.MedicalRecord;
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

import java.math.BigDecimal;
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
 * Cách tiếp cận: nạp dữ liệu theo khoảng thời gian rồi tổng hợp trong Java (quy mô
 * phòng khám nhỏ nên chấp nhận được), tránh native query phụ thuộc dialect.
 *
 * Lưu ý trung thực: thời gian khám trung bình và tỉ lệ đúng giờ (UC-52) hiện KHÔNG
 * tính được vì hệ thống chưa lưu mốc bắt đầu/kết thúc buổi khám — các trường này để
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

        // Độ dài hàng đợi (WAITING) hôm nay theo từng bác sĩ — gom từ một lần nạp
        Map<String, Long> queueByDoctor = new LinkedHashMap<>();
        for (Appointment a : appointmentRepository.findByAppointmentTimeBetween(start, end)) {
            if (a.getStatus() == AppointmentStatus.WAITING && a.getDoctor() != null) {
                queueByDoctor.merge(a.getDoctor().getFullName(), 1L, Long::sum);
            }
        }

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("todayTotalAppointments", total);
        result.put("todayCompletedAppointments", completed);
        result.put("queueLengthByDoctor", queueByDoctor);
        result.put("pendingPrescriptions", prescriptionRepository.countByStatus(PrescriptionStatus.PENDING));
        result.put("outstandingInvoices", invoiceRepository.countOutstanding());
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
                    ? i.getAppointment().getDoctor().getFullName() : "—";
            byDoctor.merge(doctorName, amount, BigDecimal::add);
        }

        Map<String, BigDecimal> byCategory = new LinkedHashMap<>();
        byCategory.put("SERVICE", serviceFee);
        byCategory.put("LAB", labFee);
        byCategory.put("MEDICINE", medicineFee);

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("from", from);
        result.put("to", to);
        result.put("invoiceCount", paid.size());
        result.put("totalRevenue", totalRevenue);
        result.put("byServiceCategory", byCategory);
        result.put("byDoctor", byDoctor);
        result.put("byPaymentMethod", byMethod);
        return result;
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
            if (isNew) newPatients++;
            else returningPatients++;
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

        // Đếm số bệnh nhân đã khám (lịch COMPLETED) theo bác sĩ
        Map<Long, Long> seenByDoctor = new LinkedHashMap<>();
        for (Appointment a : appts) {
            if (a.getStatus() == AppointmentStatus.COMPLETED && a.getDoctor() != null) {
                seenByDoctor.merge(a.getDoctor().getId(), 1L, Long::sum);
            }
        }
        // Đếm số đơn thuốc theo bác sĩ (qua hồ sơ bệnh án)
        Map<Long, Long> presByDoctor = new LinkedHashMap<>();
        for (Prescription p : prescriptions) {
            if (p.getMedicalRecord() != null && p.getMedicalRecord().getDoctor() != null) {
                presByDoctor.merge(p.getMedicalRecord().getDoctor().getId(), 1L, Long::sum);
            }
        }

        List<Map<String, Object>> result = new ArrayList<>();
        for (Doctor d : doctorRepository.findAll()) {
            Map<String, Object> row = new LinkedHashMap<>();
            row.put("doctorId", d.getId());
            row.put("doctorName", d.getFullName());
            row.put("patientsSeen", seenByDoctor.getOrDefault(d.getId(), 0L));
            row.put("prescriptionVolume", presByDoctor.getOrDefault(d.getId(), 0L));
            // Chưa lưu mốc thời gian khám → không tính được, trả null để không bịa số
            row.put("avgConsultationMinutes", null);
            row.put("onTimeRate", null);
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
}
