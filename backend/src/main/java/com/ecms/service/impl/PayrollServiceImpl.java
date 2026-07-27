package com.ecms.service.impl;

import com.ecms.dto.request.PayrollItemUpdateRequest;
import com.ecms.entity.AppointmentStatus;
import com.ecms.entity.Doctor;
import com.ecms.entity.LabTechnician;
import com.ecms.entity.PayrollItem;
import com.ecms.entity.PayrollPeriod;
import com.ecms.entity.Staff;
import com.ecms.exception.ResourceNotFoundException;
import com.ecms.repository.AppointmentRepository;
import com.ecms.repository.CareSessionRepository;
import com.ecms.repository.DoctorRepository;
import com.ecms.repository.LabOrderRepository;
import com.ecms.repository.LabTechnicianRepository;
import com.ecms.repository.PayrollItemRepository;
import com.ecms.repository.PayrollPeriodRepository;
import com.ecms.repository.StaffRepository;
import com.ecms.service.AuditLogService;
import com.ecms.service.PayrollService;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * @author  ThangNB - HE201024
 * @created 2026-07-19
 * @updated 2026-07-19
 *
 * Payroll approval logic (UC-54 Approve Payroll).
 *
 * Calculation model:
 *  - base salary comes from a per-role configured default; the Manager can
 *    override any line by hand (UC-54 normal flow step 3)
 *  - performance bonus = activity completed in the period × the role's rate:
 *      · doctor         — COMPLETED appointments × {@code payroll.doctor.rate-per-visit}
 *      · nurse          — care sessions delivered × {@code payroll.nurse.rate-per-session}
 *      · lab technician — results returned    × {@code payroll.lab.rate-per-test}
 *    other staff have no activity trail in the system, so their line is seeded
 *    with the role default only
 *  - net pay = base salary + bonus − deduction
 *  - approving a period locks every line (BR-09 / BR-17) and writes to the
 *    Audit Log (UC-54 POST-4)
 *
 * This is a deliberately simple model: the system stores no salary scale or
 * detailed attendance, so anything more nuanced is left to manual adjustment
 * rather than invented here.
 */
@Service
@RequiredArgsConstructor
public class PayrollServiceImpl implements PayrollService {

    private final PayrollPeriodRepository periodRepository;
    private final PayrollItemRepository itemRepository;
    private final DoctorRepository doctorRepository;
    private final StaffRepository staffRepository;
    private final LabTechnicianRepository labTechnicianRepository;
    private final AppointmentRepository appointmentRepository;
    private final CareSessionRepository careSessionRepository;
    private final LabOrderRepository labOrderRepository;
    private final AuditLogService auditLogService;

    @Value("${payroll.doctor.rate-per-visit:50000}")
    private BigDecimal doctorRatePerVisit;
    @Value("${payroll.nurse.rate-per-session:30000}")
    private BigDecimal nurseRatePerSession;
    @Value("${payroll.lab.rate-per-test:20000}")
    private BigDecimal labRatePerTest;

    // Per-role default base salary; the Manager may still override each line.
    @Value("${payroll.base-salary.doctor:15000000}")
    private BigDecimal baseSalaryDoctor;
    @Value("${payroll.base-salary.staff:8000000}")
    private BigDecimal baseSalaryStaff;
    @Value("${payroll.base-salary.lab-technician:9000000}")
    private BigDecimal baseSalaryLabTechnician;

    /** UC-54 E-1: lệch quá bao nhiêu phần trăm so với số hệ thống tính thì bắt buộc ghi lý do. */
    @Value("${payroll.variance-threshold-percent:20}")
    private BigDecimal varianceThresholdPercent;

    /** Role name on the linked user account that marks a {@link Staff} row as a
     *  nurse. Nurses share the staffs table with receptionists and pharmacists,
     *  and the position column is free text ("Điều dưỡng viên" in the seed data),
     *  so the account role is the only reliable discriminator. */
    private static final String ROLE_NURSE = "NURSE";

    /**
     * Generates or regenerates the DRAFT payroll for a month
     * (UC-54 normal flow step 2).
     *
     * Rebuilds the lines from scratch each time so a re-run always reflects the
     * latest activity data.
     *
     * @param year  pay period year
     * @param month pay period month, 1-12
     * @return the draft period with its lines
     * @throws IllegalArgumentException if month is outside 1-12
     * @throws IllegalStateException    if the period is already APPROVED
     *
     * Validate: BR-09 / UC-54 POST-2 — an approved period cannot be
     * regenerated, otherwise locked pay lines could be silently rewritten.
     */
    @Override
    @Transactional
    public Map<String, Object> generateDraft(int year, int month) {
        if (month < 1 || month > 12) {
            throw new IllegalArgumentException("Tháng không hợp lệ: " + month);
        }

        // BR-09 / UC-54 POST-2: an approved period is frozen — refuse to rebuild it.
        PayrollPeriod period = periodRepository.findByYearAndMonth(year, month).orElse(null);
        if (period != null && "APPROVED".equals(period.getStatus())) {
            throw new IllegalStateException("Kỳ lương " + month + "/" + year
                    + " đã được duyệt, không thể soạn lại");
        }
        if (period == null) {
            period = periodRepository.save(PayrollPeriod.builder()
                    .year(year).month(month).status("DRAFT").build());
        } else {
            // Drop the previous draft lines so the period is recomputed cleanly.
            // Safe under BR-09 because only a DRAFT period reaches this branch.
            itemRepository.deleteAll(itemRepository.findByPeriod_IdOrderByStaffTypeAscStaffNameAsc(period.getId()));
        }

        LocalDate first = LocalDate.of(year, month, 1);
        LocalDate last = first.withDayOfMonth(first.lengthOfMonth());
        LocalDateTime start = first.atStartOfDay();
        LocalDateTime end = last.atTime(LocalTime.MAX);

        List<PayrollItem> items = new ArrayList<>();
        BigDecimal rate = doctorRatePerVisit != null ? doctorRatePerVisit : BigDecimal.ZERO;

        // Doctors: performance bonus driven by COMPLETED appointments in the
        // period — the "consultations completed" input named in UC-54 step 2.
        // Inactive doctors are skipped so ex-staff do not appear on payroll.
        for (Doctor d : doctorRepository.findAll()) {
            if (!isActive(d.getStatus())) continue;
            long completed = appointmentRepository.countByDateAndStatusAndDoctorId(
                    start, end, AppointmentStatus.COMPLETED, d.getId());
            BigDecimal base = nz(baseSalaryDoctor);
            BigDecimal bonus = rate.multiply(BigDecimal.valueOf(completed));
            items.add(PayrollItem.builder()
                    .period(period)
                    .staffType("DOCTOR")
                    .staffRefId(d.getId())
                    .staffName(d.getFullName())
                    .role(d.getSpecialization())
                    .baseSalary(base)
                    .activityCount((int) completed)
                    .performanceBonus(bonus)
                    .deduction(BigDecimal.ZERO)
                    .netPay(base.add(bonus))
                    .systemNetPay(base.add(bonus))
                    .locked(false)
                    .build());
        }

        // Non-doctor staff. Nurses have an activity trail of their own — the care
        // sessions they delivered — so they are paid on the same performance model
        // as doctors. For the remaining roles (reception, pharmacy, management) the
        // system records nothing countable, so the line is seeded with the role
        // default and left for manual adjustment.
        BigDecimal nurseRate = nz(nurseRatePerSession);
        for (Staff s : staffRepository.findAll()) {
            if (!isActive(s.getStatus())) continue;
            BigDecimal baseStaff = nz(baseSalaryStaff);

            long sessions = 0;
            if (isNurse(s)) {
                // CareSession.nurse points at the user account, not the staff row.
                sessions = careSessionRepository.countCompletedByNurseBetween(
                        s.getUser().getId(), start, end);
            }
            BigDecimal nurseBonus = nurseRate.multiply(BigDecimal.valueOf(sessions));

            items.add(PayrollItem.builder()
                    .period(period)
                    .staffType("STAFF")
                    .staffRefId(s.getId())
                    .staffName(s.getFullName())
                    .role(s.getPosition() != null ? s.getPosition() : s.getDepartment())
                    .baseSalary(baseStaff)
                    .activityCount((int) sessions)
                    .performanceBonus(nurseBonus)
                    .deduction(BigDecimal.ZERO)
                    .netPay(baseStaff.add(nurseBonus))
                    .systemNetPay(baseStaff.add(nurseBonus))
                    .locked(false)
                    .build());
        }

        // Lab technicians live in their own table rather than staffs, so they need
        // a pass of their own — without it they would be left off payroll entirely.
        // Bonus is driven by the results they returned inside the period.
        BigDecimal labRate = nz(labRatePerTest);
        for (LabTechnician t : labTechnicianRepository.findAll()) {
            if (!isActive(t.getStatus())) continue;
            long tests = labOrderRepository.countCompletedByTechnicianBetween(t.getId(), start, end);
            BigDecimal baseLab = nz(baseSalaryLabTechnician);
            BigDecimal labBonus = labRate.multiply(BigDecimal.valueOf(tests));
            items.add(PayrollItem.builder()
                    .period(period)
                    .staffType("LAB_TECHNICIAN")
                    .staffRefId(t.getId())
                    .staffName(t.getFullName())
                    .role(t.getSpecialization() != null ? t.getSpecialization() : "Kỹ thuật viên xét nghiệm")
                    .baseSalary(baseLab)
                    .activityCount((int) tests)
                    .performanceBonus(labBonus)
                    .deduction(BigDecimal.ZERO)
                    .netPay(baseLab.add(labBonus))
                    .systemNetPay(baseLab.add(labBonus))
                    .locked(false)
                    .build());
        }

        itemRepository.saveAll(items);
        return getPeriod(period.getId());
    }

    /**
     * Lists pay periods, newest month first, without their lines.
     *
     * @return period summaries
     */
    @Override
    @Transactional(readOnly = true)
    public List<Map<String, Object>> listPeriods() {
        List<Map<String, Object>> result = new ArrayList<>();
        for (PayrollPeriod p : periodRepository.findAllByOrderByYearDescMonthDesc()) {
            result.add(toPeriodMap(p, false));
        }
        return result;
    }

    /**
     * Loads one pay period with all of its lines, for the review table.
     *
     * @param periodId pay period primary key
     * @return the period and its lines
     * @throws ResourceNotFoundException if no such period
     */
    @Override
    @Transactional(readOnly = true)
    public Map<String, Object> getPeriod(Long periodId) {
        PayrollPeriod period = periodRepository.findById(periodId)
                .orElseThrow(() -> new ResourceNotFoundException("Kỳ lương không tồn tại: " + periodId));
        return toPeriodMap(period, true);
    }

    /**
     * Applies a Manager override to one payroll line and recomputes its net pay
     * (UC-54 normal flow step 3).
     *
     * Only the fields present in the request are touched, so a partial edit
     * cannot silently zero the others.
     *
     * @param itemId  payroll line primary key
     * @param request overridden amounts plus justification note
     * @return the updated line
     * @throws ResourceNotFoundException if no such line
     * @throws IllegalStateException     if the line or its period is approved
     *
     * Validate: BR-09 / UC-54 POST-2 — an approved period's lines are locked.
     * Both the line flag and the period status are checked, so a line cannot be
     * edited through a stale reference even if its own flag was missed.
     */
    @Override
    @Transactional
    public Map<String, Object> updateItem(Long itemId, PayrollItemUpdateRequest request) {
        PayrollItem item = itemRepository.findById(itemId)
                .orElseThrow(() -> new ResourceNotFoundException("Dòng lương không tồn tại: " + itemId));

        // BR-09 / BR-17: approved payroll is immutable.
        if (Boolean.TRUE.equals(item.getLocked())
                || "APPROVED".equals(item.getPeriod().getStatus())) {
            throw new IllegalStateException("Kỳ lương đã duyệt, không thể chỉnh sửa");
        }

        if (request.getBaseSalary() != null) item.setBaseSalary(request.getBaseSalary());
        if (request.getPerformanceBonus() != null) item.setPerformanceBonus(request.getPerformanceBonus());
        if (request.getDeduction() != null) item.setDeduction(request.getDeduction());
        if (request.getNote() != null) item.setNote(request.getNote());

        // Net pay is always derived, never taken from the client, so an
        // adjusted line cannot disagree with its own components.
        item.setNetPay(nz(item.getBaseSalary())
                .add(nz(item.getPerformanceBonus()))
                .subtract(nz(item.getDeduction())));

        // UC-54 E-1. Chặn ở service chứ không chỉ ở UI: duyệt xong là khóa vĩnh viễn
        // (BR-09), không còn cơ hội hỏi "vì sao sửa".
        requireJustificationIfBeyondThreshold(item);

        itemRepository.save(item);
        return toItemMap(item);
    }

    /**
     * Approves the pay period and locks it (UC-54 normal flow steps 4-7).
     *
     * Runs in one transaction so the status change, the line locking and the
     * audit entry cannot land apart from each other.
     *
     * @param periodId    pay period primary key
     * @param actorUserId approving manager, recorded on the period and in the
     *                    Audit Log
     * @return the approved period
     * @throws ResourceNotFoundException if no such period
     * @throws IllegalStateException     if already approved, has no lines, or
     *         still contains a line with no base salary
     *
     * Validate: BR-17 — approval is attributed to the acting Clinic Manager
     * and written to the Audit Log (UC-54 POST-4); BR-09 — every line is
     * locked and can no longer be edited or removed (UC-54 POST-2);
     * UC-54 E-2 — a period with incomplete pay data cannot be approved.
     */
    @Override
    @Transactional
    public Map<String, Object> approve(Long periodId, Long actorUserId) {
        PayrollPeriod period = periodRepository.findById(periodId)
                .orElseThrow(() -> new ResourceNotFoundException("Kỳ lương không tồn tại: " + periodId));
        // Idempotency guard: approving twice would rewrite approvedBy/approvedAt.
        if ("APPROVED".equals(period.getStatus())) {
            throw new IllegalStateException("Kỳ lương này đã được duyệt");
        }

        List<PayrollItem> items = itemRepository.findByPeriod_IdOrderByStaffTypeAscStaffNameAsc(periodId);

        // UC-54 E-2: dữ liệu thiếu phải chặn TRƯỚC khi khóa, vì approve là một chiều
        // (BR-09) — duyệt nhầm là khóa vĩnh viễn dòng lương 0đ.
        if (items.isEmpty()) {
            throw new IllegalStateException("Kỳ lương chưa có dòng nào, không thể duyệt");
        }
        List<String> missingBase = new ArrayList<>();
        for (PayrollItem it : items) {
            if (nz(it.getBaseSalary()).compareTo(BigDecimal.ZERO) <= 0) {
                missingBase.add(it.getStaffName());
            }
        }
        if (!missingBase.isEmpty()) {
            throw new IllegalStateException("Không thể duyệt: còn " + missingBase.size()
                    + " dòng chưa có lương cơ bản (" + String.join(", ", missingBase)
                    + "). Vui lòng bổ sung trước khi duyệt.");
        }

        period.setStatus("APPROVED");
        period.setApprovedBy(actorUserId);
        period.setApprovedAt(LocalDateTime.now());

        // BR-09 / UC-54 POST-2: lock every line as part of the same transaction
        // as the status change, so no line can stay editable after approval.
        BigDecimal total = BigDecimal.ZERO;
        for (PayrollItem it : items) {
            it.setLocked(true);
            total = total.add(nz(it.getNetPay()));
        }
        itemRepository.saveAll(items);
        periodRepository.save(period);

        // BR-17 / UC-54 POST-4: record who approved which period, and when.
        try {
            String summary = "Duyệt bảng lương " + period.getMonth() + "/" + period.getYear()
                    + " — " + items.size() + " dòng, tổng thực nhận " + total;
            auditLogService.log(actorUserId, "APPROVE_PAYROLL", "PayrollPeriod",
                    String.valueOf(periodId), null, summary, null);
        } catch (Exception ignored) {
        }

        return toPeriodMap(period, true);
    }

    // ─────────────────────────────── helpers ───────────────────────────────

    /**
     * Whether a staff record counts as currently employed.
     *
     * A null status is treated as active for legacy rows that predate the
     * status column, so existing staff are not silently dropped from payroll.
     *
     * @param status staff status value, may be null
     * @return true when the person should appear on the payroll
     */
    private boolean isActive(String status) {
        return status == null || "ACTIVE".equalsIgnoreCase(status);
    }

    /**
     * Enforces UC-54 E-1: an override beyond the configured variance threshold cannot
     * be saved without a justification note.
     *
     * The baseline is {@code systemNetPay} (frozen at draft generation), not the
     * previous value, so ten 5% edits still add up to a 50% variance and get caught.
     *
     * @param item the payroll line, already updated and with net pay recomputed
     * @throws IllegalStateException when the variance is exceeded and no note is present
     */
    private void requireJustificationIfBeyondThreshold(PayrollItem item) {
        BigDecimal baseline = item.getSystemNetPay();
        // Dòng cũ chưa có baseline: bỏ qua thay vì chặn oan mọi chỉnh sửa.
        if (baseline == null) return;

        boolean hasNote = item.getNote() != null && !item.getNote().isBlank();
        if (hasNote) return;

        BigDecimal actual = nz(item.getNetPay());
        if (baseline.compareTo(BigDecimal.ZERO) == 0) {
            // Không chia được cho 0. Hệ thống tính ra 0 mà giờ trả tiền thì luôn phải giải thích.
            if (actual.compareTo(BigDecimal.ZERO) != 0) {
                throw new IllegalStateException("Hệ thống tính lương thực nhận là 0 cho "
                        + item.getStaffName() + ". Vui lòng ghi lý do điều chỉnh.");
            }
            return;
        }

        BigDecimal variancePercent = actual.subtract(baseline).abs()
                .multiply(BigDecimal.valueOf(100))
                .divide(baseline.abs(), 2, RoundingMode.HALF_UP);

        if (variancePercent.compareTo(nz(varianceThresholdPercent)) > 0) {
            throw new IllegalStateException("Điều chỉnh lệch " + variancePercent + "% so với mức hệ thống tính ("
                    + baseline.toPlainString() + ") cho " + item.getStaffName()
                    + ", vượt ngưỡng " + varianceThresholdPercent
                    + "%. Vui lòng ghi lý do điều chỉnh trước khi lưu.");
        }
    }

    /**
     * Whether a staff row belongs to a nurse, and therefore earns the care-session
     * performance bonus.
     *
     * Decided from the linked account's role, not from {@code position}: that
     * column is free text and holds Vietnamese job titles in the seed data, so
     * matching it would silently pay nurses nothing.
     *
     * @param s the staff row, whose user account may be null on legacy data
     * @return true when the staff member is a nurse
     */
    private boolean isNurse(Staff s) {
        return s.getUser() != null
                && s.getUser().getRole() != null
                && ROLE_NURSE.equalsIgnoreCase(s.getUser().getRole().getName());
    }

    /**
     * Maps a pay period to its API representation.
     *
     * @param p            the period
     * @param includeItems whether to embed the payroll lines
     * @return period fields keyed by name
     */
    private Map<String, Object> toPeriodMap(PayrollPeriod p, boolean includeItems) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", p.getId());
        m.put("year", p.getYear());
        m.put("month", p.getMonth());
        m.put("status", p.getStatus());
        m.put("approvedBy", p.getApprovedBy());
        m.put("approvedAt", p.getApprovedAt());
        m.put("createdAt", p.getCreatedAt());
        if (includeItems) {
            List<PayrollItem> items = itemRepository.findByPeriod_IdOrderByStaffTypeAscStaffNameAsc(p.getId());
            List<Map<String, Object>> itemMaps = new ArrayList<>();
            BigDecimal total = BigDecimal.ZERO;
            for (PayrollItem it : items) {
                itemMaps.add(toItemMap(it));
                total = total.add(nz(it.getNetPay()));
            }
            m.put("items", itemMaps);
            m.put("totalNetPay", total);
        }
        return m;
    }

    /**
     * Maps a payroll line to its API representation, including the
     * {@code locked} flag the UI uses to disable editing (BR-09).
     *
     * @param it the payroll line
     * @return line fields keyed by name
     */
    private Map<String, Object> toItemMap(PayrollItem it) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", it.getId());
        m.put("staffType", it.getStaffType());
        m.put("staffRefId", it.getStaffRefId());
        m.put("staffName", it.getStaffName());
        m.put("role", it.getRole());
        m.put("baseSalary", it.getBaseSalary());
        m.put("activityCount", it.getActivityCount());
        m.put("performanceBonus", it.getPerformanceBonus());
        m.put("deduction", it.getDeduction());
        m.put("netPay", it.getNetPay());
        m.put("systemNetPay", it.getSystemNetPay());
        m.put("note", it.getNote());
        m.put("locked", it.getLocked());
        return m;
    }

    /**
     * Null-safe amount, so a missing component contributes 0 to net pay
     * instead of throwing mid-calculation.
     *
     * @param v amount, may be null
     * @return {@code v}, or {@code BigDecimal.ZERO}
     */
    private static BigDecimal nz(BigDecimal v) {
        return v != null ? v : BigDecimal.ZERO;
    }
}
