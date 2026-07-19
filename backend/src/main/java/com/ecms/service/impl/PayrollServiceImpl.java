package com.ecms.service.impl;

import com.ecms.dto.request.PayrollItemUpdateRequest;
import com.ecms.entity.AppointmentStatus;
import com.ecms.entity.Doctor;
import com.ecms.entity.PayrollItem;
import com.ecms.entity.PayrollPeriod;
import com.ecms.entity.Staff;
import com.ecms.exception.ResourceNotFoundException;
import com.ecms.repository.AppointmentRepository;
import com.ecms.repository.DoctorRepository;
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
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * UC-54: Triển khai duyệt bảng lương.
 *
 * Cách tính (MVP, có thể tinh chỉnh sau):
 *  - Lương cơ bản (baseSalary) mặc định 0 — Quản lý nhập/điều chỉnh tay từng dòng.
 *  - Thưởng hiệu suất bác sĩ = số lượt khám COMPLETED trong kỳ × đơn giá cấu hình
 *    (payroll.doctor.rate-per-visit, mặc định 0).
 *  - Thực nhận = lương cơ bản + thưởng − khấu trừ.
 *  - Duyệt kỳ → khóa toàn bộ dòng (BR-09/BR-17) và ghi Audit Log.
 *
 * Ghi chú trung thực: đây là mô hình lương tối giản do hệ thống chưa lưu thang lương/
 * chấm công chi tiết; các thành phần phức tạp hơn để Quản lý điều chỉnh tay.
 */
@Service
@RequiredArgsConstructor
public class PayrollServiceImpl implements PayrollService {

    private final PayrollPeriodRepository periodRepository;
    private final PayrollItemRepository itemRepository;
    private final DoctorRepository doctorRepository;
    private final StaffRepository staffRepository;
    private final AppointmentRepository appointmentRepository;
    private final AuditLogService auditLogService;

    @Value("${payroll.doctor.rate-per-visit:0}")
    private BigDecimal doctorRatePerVisit;

    @Override
    @Transactional
    public Map<String, Object> generateDraft(int year, int month) {
        if (month < 1 || month > 12) {
            throw new IllegalArgumentException("Tháng không hợp lệ: " + month);
        }

        PayrollPeriod period = periodRepository.findByYearAndMonth(year, month).orElse(null);
        if (period != null && "APPROVED".equals(period.getStatus())) {
            throw new IllegalStateException("Kỳ lương " + month + "/" + year
                    + " đã được duyệt, không thể soạn lại");
        }
        if (period == null) {
            period = periodRepository.save(PayrollPeriod.builder()
                    .year(year).month(month).status("DRAFT").build());
        } else {
            // Xóa các dòng nháp cũ để tính lại
            itemRepository.deleteAll(itemRepository.findByPeriod_IdOrderByStaffTypeAscStaffNameAsc(period.getId()));
        }

        LocalDate first = LocalDate.of(year, month, 1);
        LocalDate last = first.withDayOfMonth(first.lengthOfMonth());
        LocalDateTime start = first.atStartOfDay();
        LocalDateTime end = last.atTime(LocalTime.MAX);

        List<PayrollItem> items = new ArrayList<>();
        BigDecimal rate = doctorRatePerVisit != null ? doctorRatePerVisit : BigDecimal.ZERO;

        // Bác sĩ (bảng doctors): thưởng theo số lượt khám hoàn thành trong kỳ
        for (Doctor d : doctorRepository.findAll()) {
            if (!isActive(d.getStatus())) continue;
            long completed = appointmentRepository.countByDateAndStatusAndDoctorId(
                    start, end, AppointmentStatus.COMPLETED, d.getId());
            BigDecimal bonus = rate.multiply(BigDecimal.valueOf(completed));
            items.add(PayrollItem.builder()
                    .period(period)
                    .staffType("DOCTOR")
                    .staffRefId(d.getId())
                    .staffName(d.getFullName())
                    .role(d.getSpecialization())
                    .baseSalary(BigDecimal.ZERO)
                    .activityCount((int) completed)
                    .performanceBonus(bonus)
                    .deduction(BigDecimal.ZERO)
                    .netPay(bonus)
                    .locked(false)
                    .build());
        }

        // Nhân viên khác (bảng staffs): base/bonus mặc định 0 để Quản lý nhập tay
        for (Staff s : staffRepository.findAll()) {
            if (!isActive(s.getStatus())) continue;
            items.add(PayrollItem.builder()
                    .period(period)
                    .staffType("STAFF")
                    .staffRefId(s.getId())
                    .staffName(s.getFullName())
                    .role(s.getPosition() != null ? s.getPosition() : s.getDepartment())
                    .baseSalary(BigDecimal.ZERO)
                    .activityCount(0)
                    .performanceBonus(BigDecimal.ZERO)
                    .deduction(BigDecimal.ZERO)
                    .netPay(BigDecimal.ZERO)
                    .locked(false)
                    .build());
        }

        itemRepository.saveAll(items);
        return getPeriod(period.getId());
    }

    @Override
    @Transactional(readOnly = true)
    public List<Map<String, Object>> listPeriods() {
        List<Map<String, Object>> result = new ArrayList<>();
        for (PayrollPeriod p : periodRepository.findAllByOrderByYearDescMonthDesc()) {
            result.add(toPeriodMap(p, false));
        }
        return result;
    }

    @Override
    @Transactional(readOnly = true)
    public Map<String, Object> getPeriod(Long periodId) {
        PayrollPeriod period = periodRepository.findById(periodId)
                .orElseThrow(() -> new ResourceNotFoundException("Kỳ lương không tồn tại: " + periodId));
        return toPeriodMap(period, true);
    }

    @Override
    @Transactional
    public Map<String, Object> updateItem(Long itemId, PayrollItemUpdateRequest request) {
        PayrollItem item = itemRepository.findById(itemId)
                .orElseThrow(() -> new ResourceNotFoundException("Dòng lương không tồn tại: " + itemId));

        if (Boolean.TRUE.equals(item.getLocked())
                || "APPROVED".equals(item.getPeriod().getStatus())) {
            throw new IllegalStateException("Kỳ lương đã duyệt, không thể chỉnh sửa");
        }

        if (request.getBaseSalary() != null) item.setBaseSalary(request.getBaseSalary());
        if (request.getPerformanceBonus() != null) item.setPerformanceBonus(request.getPerformanceBonus());
        if (request.getDeduction() != null) item.setDeduction(request.getDeduction());
        if (request.getNote() != null) item.setNote(request.getNote());

        item.setNetPay(nz(item.getBaseSalary())
                .add(nz(item.getPerformanceBonus()))
                .subtract(nz(item.getDeduction())));

        itemRepository.save(item);
        return toItemMap(item);
    }

    @Override
    @Transactional
    public Map<String, Object> approve(Long periodId, Long actorUserId) {
        PayrollPeriod period = periodRepository.findById(periodId)
                .orElseThrow(() -> new ResourceNotFoundException("Kỳ lương không tồn tại: " + periodId));
        if ("APPROVED".equals(period.getStatus())) {
            throw new IllegalStateException("Kỳ lương này đã được duyệt");
        }

        period.setStatus("APPROVED");
        period.setApprovedBy(actorUserId);
        period.setApprovedAt(LocalDateTime.now());

        List<PayrollItem> items = itemRepository.findByPeriod_IdOrderByStaffTypeAscStaffNameAsc(periodId);
        BigDecimal total = BigDecimal.ZERO;
        for (PayrollItem it : items) {
            it.setLocked(true);
            total = total.add(nz(it.getNetPay()));
        }
        itemRepository.saveAll(items);
        periodRepository.save(period);

        // BR-17: ghi Audit Log việc duyệt lương
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

    private boolean isActive(String status) {
        return status == null || "ACTIVE".equalsIgnoreCase(status);
    }

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
        m.put("note", it.getNote());
        m.put("locked", it.getLocked());
        return m;
    }

    private static BigDecimal nz(BigDecimal v) {
        return v != null ? v : BigDecimal.ZERO;
    }
}
