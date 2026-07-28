package com.ecms.service.impl;

import com.ecms.entity.Appointment;
import com.ecms.entity.AppointmentStatus;
import com.ecms.entity.ClinicService;
import com.ecms.entity.Doctor;
import com.ecms.entity.Feedback;
import com.ecms.entity.FeedbackParticipantRating;
import com.ecms.entity.Invoice;
import com.ecms.entity.LabOrderStatus;
import com.ecms.entity.MedicalRecord;
import com.ecms.entity.MedicalRecordStatus;
import com.ecms.entity.Patient;
import com.ecms.entity.Prescription;
import com.ecms.entity.PrescriptionStatus;
import com.ecms.repository.AppointmentRepository;
import com.ecms.repository.CareSessionRepository;
import com.ecms.repository.DoctorRepository;
import com.ecms.repository.FeedbackParticipantRatingRepository;
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
import org.apache.poi.ss.usermodel.Cell;
import org.apache.poi.ss.usermodel.CellStyle;
import org.apache.poi.ss.usermodel.Font;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;

import java.io.IOException;
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
 * from check-in time versus scheduled time — a COMPLETED visit with no check-in
 * counts as not-on-time, with the count of such visits reported alongside so the
 * figure can be read in context. Both are approximations of the
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
    private final FeedbackParticipantRatingRepository participantRatingRepository;
    private final CareSessionRepository careSessionRepository;
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
                    ? i.getAppointment().getDoctor().getFullName()
                    : "—";
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
                            ? i.getAppointment().getDoctor().getFullName()
                            : "—");
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
            if (isNew)
                newPatients++;
            else
                returningPatients++;
        }

        // UC-51: top 5 dịch vụ được đặt nhiều nhất trong kỳ.
        //
        // Thay cho bảng xếp hạng chẩn đoán trước đây: medical_records.diagnosis là text
        // bác sĩ gõ tay, không có mã ICD, nên "Viêm kết mạc cấp" và "Viêm kết mạc cấp do
        // vi khuẩn" bị đếm thành hai bệnh khác nhau — bảng xếp hạng gần như luôn ra toàn
        // "1 ca" và không dùng được. Dịch vụ thì có danh mục và id nên gom nhóm chính xác.
        //
        // Bỏ lịch đã hủy: đặt rồi hủy không phản ánh dịch vụ nào đang được dùng nhiều.
        Map<Long, long[]> serviceCount = new LinkedHashMap<>();
        Map<Long, String> serviceName = new LinkedHashMap<>();
        for (Appointment a : appts) {
            if (a.getStatus() == AppointmentStatus.CANCELLED) continue;
            ClinicService svc = a.getClinicService();
            if (svc == null) continue;
            serviceName.putIfAbsent(svc.getId(), svc.getServiceName());
            serviceCount.computeIfAbsent(svc.getId(), k -> new long[1])[0]++;
        }
        List<Map<String, Object>> topServices = serviceCount.entrySet().stream()
                .sorted((a, b) -> Long.compare(b.getValue()[0], a.getValue()[0]))
                .limit(5)
                .map(e -> {
                    Map<String, Object> m = new LinkedHashMap<>();
                    m.put("serviceId", e.getKey());
                    m.put("serviceName", serviceName.get(e.getKey()));
                    m.put("count", e.getValue()[0]);
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
        result.put("topServices", topServices);
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
        // On time = the patient checked in no later than the scheduled time.
        // UC52-01: ca COMPLETED không có check-in vẫn nằm trong mẫu số và tính là KHÔNG
        // đúng giờ — không có mốc check-in thì không chứng minh được đúng giờ. Số ca
        // thiếu check-in trả riêng để biết tỉ lệ dựa trên dữ liệu nào.
        Map<Long, Long> seenByDoctor = new LinkedHashMap<>();
        Map<Long, long[]> onTimeByDoctor = new LinkedHashMap<>(); // [đúng giờ, tổng ca COMPLETED]
        Map<Long, Long> noCheckInByDoctor = new LinkedHashMap<>();
        for (Appointment a : appts) {
            if (a.getStatus() != AppointmentStatus.COMPLETED || a.getDoctor() == null)
                continue;
            Long did = a.getDoctor().getId();
            seenByDoctor.merge(did, 1L, Long::sum);

            long[] agg = onTimeByDoctor.computeIfAbsent(did, k -> new long[2]);
            agg[1] += 1;
            if (a.getCheckInTime() != null && a.getAppointmentTime() != null) {
                if (!a.getCheckInTime().isAfter(a.getAppointmentTime()))
                    agg[0] += 1;
            } else {
                noCheckInByDoctor.merge(did, 1L, Long::sum);
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
            // Con số này lớn nghĩa là tỉ lệ đúng giờ phản ánh quy trình check-in, không
            // phải bác sĩ.
            row.put("appointmentsWithoutCheckIn", noCheckInByDoctor.getOrDefault(d.getId(), 0L));

            result.add(row);
        }
        return result;
    }

    // ─────────────────────────────── UC-53 ───────────────────────────────

    /**
     * Aggregated patient feedback for a period (UC-53 normal flow step 4):
     * average rating per doctor and per nurse, per-participant ratings broken
     * down by role and by person, total responses and response rate.
     *
     * Two different things are averaged here and they are deliberately kept
     * apart. {@code byDoctor} / {@code byNurse} average the visit's overall
     * star rating, attributed to whoever led the visit. {@code byRole} /
     * {@code byStaff} average the per-participant stars the patient gave to
     * each individual (UC-48) — the only place a receptionist or lab technician
     * is ever scored. Merging them would count one submission twice.
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
        Map<String, long[]> perNurseAgg = new LinkedHashMap<>();
        for (Feedback f : feedbacks) {
            int r = f.getRating() != null ? f.getRating() : 0;
            sumRating += r;
            // A care-session feedback has no doctor and an appointment feedback has
            // no nurse, so each submission lands in exactly one of the two tables.
            // Feedback with neither (legacy rows) is still counted in the totals.
            if (f.getDoctor() != null) {
                accumulate(perDoctorAgg, f.getDoctor().getFullName(), r);
            } else if (f.getNurse() != null) {
                accumulate(perNurseAgg, f.getNurse().getFullName(), r);
            }
        }

        double averageRating = totalResponses > 0 ? (double) sumRating / totalResponses : 0.0;

        List<Map<String, Object>> perDoctor = new ArrayList<>();
        for (Map.Entry<String, long[]> e : perDoctorAgg.entrySet()) {
            perDoctor.add(ratingRow("doctorName", e.getKey(), e.getValue()));
        }
        List<Map<String, Object>> perNurse = new ArrayList<>();
        for (Map.Entry<String, long[]> e : perNurseAgg.entrySet()) {
            perNurse.add(ratingRow("nurseName", e.getKey(), e.getValue()));
        }

        // Per-participant stars (UC-48): the ratings patients gave to each person
        // who took part — doctor, nurse, receptionist, lab technician. Without
        // this pass the scores are written to the database and never read back.
        Map<String, long[]> perRoleAgg = new LinkedHashMap<>();
        Map<String, long[]> perStaffAgg = new LinkedHashMap<>(); // "ROLE|name" -> [sum, count]
        for (FeedbackParticipantRating pr : participantRatingRepository
                .findByFeedbackCreatedAtBetween(start, end)) {
            int r = pr.getRating() != null ? pr.getRating() : 0;
            String role = pr.getParticipantRole() != null ? pr.getParticipantRole() : "OTHER";
            String name = pr.getParticipantName() != null ? pr.getParticipantName() : "—";
            accumulate(perRoleAgg, role, r);
            accumulate(perStaffAgg, role + "|" + name, r);
        }

        List<Map<String, Object>> byRole = new ArrayList<>();
        for (Map.Entry<String, long[]> e : perRoleAgg.entrySet()) {
            byRole.add(ratingRow("role", e.getKey(), e.getValue()));
        }
        List<Map<String, Object>> byStaff = new ArrayList<>();
        for (Map.Entry<String, long[]> e : perStaffAgg.entrySet()) {
            String[] parts = e.getKey().split("\\|", 2);
            Map<String, Object> row = ratingRow("staffName", parts.length > 1 ? parts[1] : "—", e.getValue());
            row.put("role", parts[0]);
            byStaff.add(row);
        }
        // Weakest scores first: the Manager is looking for who needs support, and
        // an unsorted list buries that behind whoever happened to be rated first.
        byStaff.sort((a, b) -> Double.compare(
                (Double) a.get("averageRating"), (Double) b.get("averageRating")));

        // Response rate = feedback count / visits that could be rated in the period.
        // Care sessions are in the denominator too, otherwise nurse feedback would
        // be counted on top of an appointments-only base and push the rate past 100%.
        // BR-21 caps feedback at one per visit, which keeps the ratio bounded.
        long completedAppointments = appointmentRepository.countByDateAndStatus(
                start, end, AppointmentStatus.COMPLETED);
        long completedCareSessions = careSessionRepository.countCompletedBetween(start, end);
        long rateable = completedAppointments + completedCareSessions;
        double responseRate = rateable > 0 ? (double) totalResponses / rateable : 0.0;

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("from", from);
        result.put("to", to);
        result.put("totalResponses", totalResponses);
        result.put("averageRating", averageRating);
        result.put("completedAppointments", completedAppointments);
        result.put("completedCareSessions", completedCareSessions);
        result.put("rateableVisits", rateable);
        result.put("responseRate", responseRate);
        result.put("byDoctor", perDoctor);
        result.put("byNurse", perNurse);
        result.put("byRole", byRole);
        result.put("byStaff", byStaff);
        return result;
    }

    /**
     * Adds one rating into a {@code key -> [sum, count]} accumulator.
     *
     * @param agg    the accumulator, mutated in place
     * @param key    grouping key
     * @param rating star rating to add
     */
    private static void accumulate(Map<String, long[]> agg, String key, int rating) {
        long[] a = agg.computeIfAbsent(key, k -> new long[2]);
        a[0] += rating;
        a[1] += 1;
    }

    /**
     * Builds one aggregated rating row.
     *
     * @param nameKey field name the group label is published under
     * @param name    the group label
     * @param agg     {@code [sum, count]} for the group
     * @return row with the label, the response count and the average
     */
    private static Map<String, Object> ratingRow(String nameKey, String name, long[] agg) {
        Map<String, Object> row = new LinkedHashMap<>();
        row.put(nameKey, name);
        row.put("responses", agg[1]);
        row.put("averageRating", agg[1] > 0 ? (double) agg[0] / agg[1] : 0.0);
        return row;
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

    // ────────────────────────── Exports (.xlsx — UC-50 bước 6) ──────────────────────────

    /**
     * Streams the revenue report as an .xlsx workbook (UC-50 steps 5-6).
     * Re-runs {@link #revenueReport} so the export always matches the figures
     * currently on screen for the same date range.
     *
     * @param from     period start, inclusive
     * @param to       period end, inclusive
     * @param response servlet response the workbook is written to
     * @throws IOException if the response stream fails
     */
    @Override
    @Transactional(readOnly = true)
    @SuppressWarnings("unchecked")
    public void exportRevenueXlsx(LocalDate from, LocalDate to, HttpServletResponse response) throws IOException {
        Map<String, Object> r = revenueReport(from, to);
        List<String[]> rows = new ArrayList<>();
        rows.add(new String[] { "Báo cáo doanh thu", from + " → " + to });
        rows.add(new String[] {});
        rows.add(new String[] { "Tổng doanh thu", String.valueOf(r.get("totalRevenue")) });
        rows.add(new String[] { "Số hóa đơn", String.valueOf(r.get("invoiceCount")) });
        rows.add(new String[] {});
        rows.add(new String[] { "Theo nhóm dịch vụ", "Doanh thu" });
        ((Map<String, Object>) r.get("byServiceCategory"))
                .forEach((k, v) -> rows.add(new String[] { k, String.valueOf(v) }));
        rows.add(new String[] {});
        rows.add(new String[] { "Theo bác sĩ", "Doanh thu" });
        ((Map<String, Object>) r.get("byDoctor"))
                .forEach((k, v) -> rows.add(new String[] { k, String.valueOf(v) }));
        rows.add(new String[] {});
        rows.add(new String[] { "Theo phương thức thanh toán", "Doanh thu" });
        ((Map<String, Object>) r.get("byPaymentMethod"))
                .forEach((k, v) -> rows.add(new String[] { k, String.valueOf(v) }));
        writeXlsx(response, "bao-cao-doanh-thu.xlsx", "Doanh thu", rows);
    }

    @Override
    @Transactional(readOnly = true)
    @SuppressWarnings("unchecked")
    /**
     * Streams the patient statistics as an .xlsx workbook (UC-51 step 4).
     *
     * @param from     period start, inclusive
     * @param to       period end, inclusive
     * @param response servlet response the workbook is written to
     * @throws IOException if the response stream fails
     */
    public void exportPatientStatisticsXlsx(LocalDate from, LocalDate to, HttpServletResponse response) throws IOException {
        Map<String, Object> r = patientStatistics(from, to);
        List<String[]> rows = new ArrayList<>();
        rows.add(new String[] { "Thống kê bệnh nhân", from + " → " + to });
        rows.add(new String[] {});
        rows.add(new String[] { "Tổng lượt khám", String.valueOf(r.get("totalAppointments")) });
        rows.add(new String[] { "Số bệnh nhân", String.valueOf(r.get("distinctPatients")) });
        rows.add(new String[] { "Bệnh nhân mới", String.valueOf(r.get("newPatients")) });
        rows.add(new String[] { "Bệnh nhân cũ", String.valueOf(r.get("returningPatients")) });
        rows.add(new String[] {});
        rows.add(new String[] { "Lịch hẹn theo trạng thái", "Số lượng" });
        ((Map<String, Object>) r.get("appointmentsByStatus"))
                .forEach((k, v) -> rows.add(new String[] { k, String.valueOf(v) }));
        rows.add(new String[] {});
        rows.add(new String[] { "Lịch hẹn theo bác sĩ", "Số lượng" });
        ((Map<String, Object>) r.get("appointmentsByDoctor"))
                .forEach((k, v) -> rows.add(new String[] { k, String.valueOf(v) }));
        rows.add(new String[] {});
        rows.add(new String[] { "Dịch vụ phổ biến", "Lượt đặt" });
        for (Map<String, Object> d : (List<Map<String, Object>>) r.get("topServices")) {
            rows.add(new String[] { String.valueOf(d.get("serviceName")), String.valueOf(d.get("count")) });
        }
        writeXlsx(response, "thong-ke-benh-nhan.xlsx", "Bệnh nhân", rows);
    }

    @Override
    @Transactional(readOnly = true)
    @SuppressWarnings("unchecked")
    /**
     * Streams the feedback report as an .xlsx workbook (UC-53 step 5).
     *
     * @param from     period start, inclusive
     * @param to       period end, inclusive
     * @param response servlet response the workbook is written to
     * @throws IOException if the response stream fails
     */
    public void exportFeedbackXlsx(LocalDate from, LocalDate to, HttpServletResponse response) throws IOException {
        Map<String, Object> r = feedbackReport(from, to);
        List<String[]> rows = new ArrayList<>();
        rows.add(new String[] { "Báo cáo đánh giá", from + " → " + to });
        rows.add(new String[] {});
        rows.add(new String[] { "Điểm trung bình", String.valueOf(r.get("averageRating")) });
        rows.add(new String[] { "Số phản hồi", String.valueOf(r.get("totalResponses")) });
        rows.add(new String[] { "Tỉ lệ phản hồi", String.valueOf(r.get("responseRate")) });
        rows.add(new String[] {});
        rows.add(new String[] { "Bác sĩ", "Số phản hồi", "Điểm TB" });
        for (Map<String, Object> row : (List<Map<String, Object>>) r.get("byDoctor")) {
            rows.add(new String[] { String.valueOf(row.get("doctorName")),
                    String.valueOf(row.get("responses")), String.valueOf(row.get("averageRating")) });
        }
        rows.add(new String[] {});
        rows.add(new String[] { "Điều dưỡng", "Số phản hồi", "Điểm TB" });
        for (Map<String, Object> row : (List<Map<String, Object>>) r.get("byNurse")) {
            rows.add(new String[] { String.valueOf(row.get("nurseName")),
                    String.valueOf(row.get("responses")), String.valueOf(row.get("averageRating")) });
        }
        rows.add(new String[] {});
        rows.add(new String[] { "Theo vai trò", "Số lượt chấm", "Điểm TB" });
        for (Map<String, Object> row : (List<Map<String, Object>>) r.get("byRole")) {
            rows.add(new String[] { String.valueOf(row.get("role")),
                    String.valueOf(row.get("responses")), String.valueOf(row.get("averageRating")) });
        }
        rows.add(new String[] {});
        rows.add(new String[] { "Nhân sự", "Vai trò", "Số lượt chấm", "Điểm TB" });
        for (Map<String, Object> row : (List<Map<String, Object>>) r.get("byStaff")) {
            rows.add(new String[] { String.valueOf(row.get("staffName")), String.valueOf(row.get("role")),
                    String.valueOf(row.get("responses")), String.valueOf(row.get("averageRating")) });
        }
        writeXlsx(response, "bao-cao-danh-gia.xlsx", "Đánh giá", rows);
    }

    /**
     * Writes rows to the response as a real .xlsx workbook (UC-50 step 6).
     *
     * Quy ước dựng bảng: dòng rỗng = ngắt khối, dòng đầu mỗi khối in đậm. Ô parse được
     * thành số thì ghi kiểu numeric để Excel SUM/sort được.
     *
     * @param response servlet response to stream into
     * @param filename download filename offered to the browser
     * @param sheetName tên sheet trong workbook
     * @param rows     bảng dữ liệu, mỗi String[] là một dòng
     * @throws IOException if the response stream fails
     */
    private void writeXlsx(HttpServletResponse response, String filename, String sheetName,
            List<String[]> rows) throws IOException {
        try (XSSFWorkbook wb = new XSSFWorkbook()) {
            Sheet sheet = wb.createSheet(sheetName);

            CellStyle boldStyle = wb.createCellStyle();
            Font boldFont = wb.createFont();
            boldFont.setBold(true);
            boldStyle.setFont(boldFont);

            int maxCols = 1;
            boolean previousRowWasBlank = true; // dòng đầu tiên cũng tính là mở khối
            for (int r = 0; r < rows.size(); r++) {
                String[] data = rows.get(r);
                Row row = sheet.createRow(r);
                maxCols = Math.max(maxCols, data.length);

                boolean isHeading = data.length > 0 && previousRowWasBlank;
                previousRowWasBlank = data.length == 0;

                for (int c = 0; c < data.length; c++) {
                    Cell cell = row.createCell(c);
                    String v = data[c];
                    Double num = asNumber(v);
                    if (num != null) {
                        cell.setCellValue(num);
                    } else {
                        cell.setCellValue(v != null ? v : "");
                    }
                    if (isHeading) cell.setCellStyle(boldStyle);
                }
            }
            for (int c = 0; c < maxCols; c++) {
                sheet.autoSizeColumn(c);
            }

            response.setContentType(
                    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
            response.setHeader("Content-Disposition", "attachment; filename=" + filename);
            wb.write(response.getOutputStream());
            response.getOutputStream().flush();
        }
    }

    /**
     * Ô có phải số thuần không, để ghi thành numeric cell.
     *
     * Chỉ nhận số đơn thuần: "2026-07-01" hay "INV-001" ép thành số sẽ hiển thị sai.
     *
     * @param v giá trị ô, có thể null
     * @return giá trị số, hoặc null nếu không phải số
     */
    private static Double asNumber(String v) {
        if (v == null || v.isBlank()) return null;
        String s = v.trim();
        if (!s.matches("-?\\d+(\\.\\d+)?")) return null;
        try {
            return Double.valueOf(s);
        } catch (NumberFormatException e) {
            return null;
        }
    }
}
