package com.ecms.service.impl;

import com.ecms.dto.request.InvoiceRequest;
import com.ecms.dto.response.DiscountApplicationResponse;
import com.ecms.dto.response.InvoiceResponse;
import com.ecms.entity.*;
import com.ecms.exception.ResourceNotFoundException;
import com.ecms.repository.AppointmentRepository;
import com.ecms.repository.InvoiceRepository;
import com.ecms.repository.LabOrderRepository;
import com.ecms.repository.MedicalRecordRepository;
import com.ecms.repository.PatientServiceSubscriptionRepository;
import com.ecms.repository.PrescriptionRepository;
import com.ecms.service.DiscountCampaignService;
import com.ecms.service.InvoiceService;
import com.ecms.service.InvoicePdfService;
import com.ecms.service.NotificationService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

/**
 * ThangNBHE201024
 *
 * Triển khai toàn bộ nghiệp vụ hóa đơn của phòng khám:
 *  - Tạo hóa đơn nháp (DRAFT) với danh sách khoản phí phân loại theo nhóm
 *  - Phát hành hóa đơn (ISSUED) sau khi thu tiền mặt hoặc QR Code
 *  - Hủy hóa đơn nháp chưa phát hành
 *  - Gửi hóa đơn điện tử qua email (JavaMailSender + HTML template)
 *  - Xuất PDF hóa đơn (delegate sang InvoicePdfService)
 *
 * Quy tắc nghiệp vụ:
 *  - Mỗi lịch hẹn chỉ được tạo một hóa đơn (kiểm tra existsByAppointment_Id)
 *  - Chỉ hóa đơn DRAFT mới được phát hành hoặc hủy
 *  - Mã hóa đơn tự sinh theo định dạng INV-yyyyMMdd-XXXX (tăng dần trong ngày)
 */
@Service
@RequiredArgsConstructor
public class InvoiceServiceImpl implements InvoiceService {

    private final InvoiceRepository invoiceRepository;
    private final AppointmentRepository appointmentRepository;
    private final PatientServiceSubscriptionRepository subscriptionRepository;
    // Việc gửi email HTML hóa đơn đã tách sang InvoiceMailDispatcher (chạy nền),
    // nên lớp này không giữ JavaMailSender nữa.
    private final MedicalRecordRepository medicalRecordRepository;
    private final PrescriptionRepository prescriptionRepository;
    private final LabOrderRepository labOrderRepository;
    private final NotificationService notificationService;
    private final InvoicePdfService invoicePdfService;
    private final DiscountCampaignService discountCampaignService;

    // Lấy tất cả hóa đơn (không kèm items) — dùng cho bảng lịch sử hóa đơn
    @Override
    @Transactional(readOnly = true)
    public List<InvoiceResponse> getAllInvoices() {
        return invoiceRepository.findAllWithDetails()
                .stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    // Tìm kiếm hóa đơn theo từ khóa; trả về toàn bộ nếu keyword rỗng
    @Override
    @Transactional(readOnly = true)
    public List<InvoiceResponse> searchInvoices(String keyword) {
        if (keyword == null || keyword.trim().isEmpty()) {
            return getAllInvoices();
        }
        return invoiceRepository.searchInvoices(keyword.trim())
                .stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    // Lấy chi tiết hóa đơn kèm danh sách khoản phí — dùng khi mở modal chi tiết hoặc in/gửi email
    @Override
    @Transactional(readOnly = true)
    public InvoiceResponse getInvoiceById(Long id) {
        Invoice invoice = invoiceRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Hóa đơn không tồn tại: " + id));
        return toResponseWithItems(invoice);
    }

    // Tìm hóa đơn theo lịch hẹn — dùng khi dashboard kiểm tra lịch hẹn đã có HĐ chưa
    @Override
    @Transactional(readOnly = true)
    public InvoiceResponse getInvoiceByAppointmentId(Long appointmentId) {
        Invoice invoice = invoiceRepository.findByAppointmentId(appointmentId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Không tìm thấy hóa đơn cho lịch hẹn: " + appointmentId));
        return toResponseWithItems(invoice);
    }

    /**
     * Tạo hóa đơn nháp (DRAFT) cho một lịch hẹn đã hoàn thành, hoặc cho một buổi
     * chăm sóc dịch vụ đơn lẻ đã check-out (UC-21, "vãng lai" totalSessions=1).
     * Tự động tính tổng phí theo từng nhóm dịch vụ (BR-12).
     * Mã hóa đơn được sinh tự động dạng INV-yyyyMMdd-XXXX.
     */
    @Override
    @Transactional
    public InvoiceResponse createInvoice(InvoiceRequest request) {
        boolean hasAppointment = request.getAppointmentId() != null;
        boolean hasSubscription = request.getSubscriptionId() != null;
        if (hasAppointment == hasSubscription) {
            throw new IllegalArgumentException("Phải cung cấp đúng một trong hai: appointmentId hoặc subscriptionId");
        }

        Appointment appointment = null;
        PatientServiceSubscription subscription = null;
        Patient patient;

        if (hasAppointment) {
            appointment = appointmentRepository.findById(request.getAppointmentId())
                    .orElseThrow(() -> new ResourceNotFoundException(
                            "Lịch hẹn không tồn tại: " + request.getAppointmentId()));
            if (invoiceRepository.existsByAppointment_IdAndStatusNot(request.getAppointmentId(), "CANCELLED")) {
                throw new IllegalStateException("Lịch hẹn này đã có hóa đơn");
            }
            patient = appointment.getPatient();
        } else {
            subscription = subscriptionRepository.findById(request.getSubscriptionId())
                    .orElseThrow(() -> new ResourceNotFoundException(
                            "Gói dịch vụ không tồn tại: " + request.getSubscriptionId()));
            if (invoiceRepository.existsBySubscription_IdAndStatusNot(request.getSubscriptionId(), "CANCELLED")) {
                throw new IllegalStateException("Gói dịch vụ này đã có hóa đơn");
            }
            patient = subscription.getPatient();
        }

        List<InvoiceItem> items = new ArrayList<>();
        BigDecimal serviceFee = BigDecimal.ZERO;
        BigDecimal labFee = BigDecimal.ZERO;
        BigDecimal medicineFee = BigDecimal.ZERO;

        if (request.getItems() != null) {
            for (InvoiceRequest.InvoiceItemRequest itemReq : request.getItems()) {
                int qty = itemReq.getQuantity() != null ? itemReq.getQuantity() : 1;
                BigDecimal price = itemReq.getUnitPrice() != null ? itemReq.getUnitPrice() : BigDecimal.ZERO;
                BigDecimal subtotal = price.multiply(BigDecimal.valueOf(qty));

                InvoiceItem item = InvoiceItem.builder()
                        .itemType(itemReq.getItemType() != null ? itemReq.getItemType() : "OTHER")
                        .refId(itemReq.getRefId())
                        .description(itemReq.getDescription())
                        .quantity(qty)
                        .unitPrice(price)
                        .subTotal(subtotal)
                        .build();
                items.add(item);

                String type = item.getItemType();
                if ("SERVICE".equals(type)) {
                    serviceFee = serviceFee.add(subtotal);
                } else if ("MEDICINE".equals(type) || "GLASSES".equals(type)) {
                    medicineFee = medicineFee.add(subtotal);
                } else if ("LAB".equals(type) || "OTHER".equals(type)) {
                    labFee = labFee.add(subtotal);
                } else {
                    labFee = labFee.add(subtotal);
                }
            }
        }

        BigDecimal subTotal = serviceFee.add(labFee).add(medicineFee);

        // BR-11: Total = Examination fee + Lab fee + Medicine fee − Discount.
        // UC-43: nếu có discountCode, hệ thống tự xác thực + tính mức giảm từ chương trình
        // giảm giá (ưu tiên hơn số tiền nhập tay); ngược lại giữ hành vi cũ (lễ tân tự nhập).
        BigDecimal discount;
        if (request.getDiscountCode() != null && !request.getDiscountCode().isBlank()) {
            DiscountApplicationResponse applied = discountCampaignService.redeemForOrder(
                    request.getDiscountCode(), subTotal);
            discount = applied.getDiscountAmount();
        } else {
            discount = request.getDiscountAmount() != null ? request.getDiscountAmount() : BigDecimal.ZERO;
        }
        // Giới hạn discount trong [0, subTotal] để tổng tiền không âm và không vượt quá phí.
        if (discount.compareTo(BigDecimal.ZERO) < 0) {
            discount = BigDecimal.ZERO;
        } else if (discount.compareTo(subTotal) > 0) {
            discount = subTotal;
        }
        BigDecimal total = subTotal.subtract(discount);

        Invoice invoice = Invoice.builder()
                .appointment(appointment)
                .subscription(subscription)
                .patient(patient)
                .invoiceCode(generateInvoiceCode())
                .serviceFee(serviceFee)
                .labFee(labFee)
                .medicineFee(medicineFee)
                .subTotal(subTotal)
                .discountAmount(discount)
                .tax(BigDecimal.ZERO)
                .totalAmount(total)
                .generatedAt(LocalDateTime.now())
                .paymentMethod(request.getPaymentMethod())
                .paymentReference(request.getPaymentReference())
                .status("DRAFT")
                .paymentStatus("VIET_QR".equals(request.getPaymentMethod())
                        ? "PENDING_PAYMENT" : "UNPAID")
                .notes(request.getNotes())
                .build();

        invoice.setItems(new ArrayList<>());
        for (InvoiceItem item : items) {
            item.setInvoice(invoice);
            invoice.getItems().add(item);
        }

        Invoice saved = invoiceRepository.save(invoice);

        // Hóa đơn QR (PENDING_PAYMENT) → tự thông báo cho bệnh nhân là có hóa đơn cần trả.
        // Hóa đơn tiền mặt (UNPAID → phát hành ngay) không cần vì thu tại quầy.
        if ("PENDING_PAYMENT".equals(saved.getPaymentStatus())) {
            notifyPaymentRequested(saved);
        }

        return toResponseWithItems(saved);
    }

    /**
     * ThangNBHE201024 — Gợi ý khoản phí cho một lịch hẹn để đổ sẵn vào modal tạo hóa đơn.
     *
     * Gộp 2 nguồn dữ liệu, giúp lễ tân không phải nhập tay từng khoản:
     *   1. Dịch vụ khám đã đặt trong lịch hẹn (Appointment.clinicService).
     *   2. Thuốc bác sĩ đã kê trong bệnh án của lịch hẹn (UC-27): duyệt các đơn thuốc
     *      của MedicalRecord, bỏ qua đơn SKIPPED (thuốc không phát cho bệnh nhân).
     *
     * Lab order KHÔNG được đưa vào: trong mô hình hiện tại LabOrder không có giá và không
     * trỏ tới một xét nghiệm riêng — "dịch vụ" của nó chỉ trùng đúng dịch vụ khám ở trên.
     *
     * Chỉ TRẢ GỢI Ý, không tạo hóa đơn. Lễ tân vẫn sửa/xóa/thêm được trước khi thu tiền.
     */
    @Override
    @Transactional(readOnly = true)
    public List<InvoiceRequest.InvoiceItemRequest> getSuggestedItems(Long appointmentId) {
        Appointment appointment = appointmentRepository.findById(appointmentId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Lịch hẹn không tồn tại: " + appointmentId));

        // Ưu tiên: nếu lịch hẹn từng có hóa đơn BỊ HỦY, đổ lại đúng khoản phí của hóa đơn
        // đã hủy gần nhất. Nhờ vậy "hủy rồi tạo lại" khôi phục nguyên trạng (gồm cả dịch vụ
        // phụ và khoản nhập tay mà không suy ra được từ lịch hẹn/đơn thuốc), thay vì mất trắng.
        List<Invoice> cancelled = invoiceRepository
                .findByAppointment_IdAndStatusOrderByCreatedAtDesc(appointmentId, "CANCELLED");
        if (!cancelled.isEmpty()) {
            List<InvoiceRequest.InvoiceItemRequest> restored = new ArrayList<>();
            for (InvoiceItem it : cancelled.get(0).getItems()) {
                // Bỏ dòng đã bị vô hiệu trong hóa đơn cũ
                if (it.getStatus() != null && !"ACTIVE".equals(it.getStatus())) continue;
                InvoiceRequest.InvoiceItemRequest req = new InvoiceRequest.InvoiceItemRequest();
                req.setItemType(it.getItemType());
                req.setRefId(it.getRefId());
                req.setDescription(it.getDescription());
                req.setQuantity(it.getQuantity() != null ? it.getQuantity() : 1);
                req.setUnitPrice(it.getUnitPrice() != null ? it.getUnitPrice() : BigDecimal.ZERO);
                restored.add(req);
            }
            if (!restored.isEmpty()) return restored;
        }

        List<InvoiceRequest.InvoiceItemRequest> suggestions = new ArrayList<>();

        // 1) Dịch vụ khám đã đặt
        ClinicService service = appointment.getClinicService();
        if (service != null) {
            InvoiceRequest.InvoiceItemRequest svc = new InvoiceRequest.InvoiceItemRequest();
            svc.setItemType("SERVICE");
            svc.setRefId(service.getId());
            svc.setDescription(service.getServiceName());
            svc.setQuantity(1);
            svc.setUnitPrice(service.getPrice() != null ? service.getPrice() : BigDecimal.ZERO);
            suggestions.add(svc);
        }

        // 2) Xét nghiệm/cận lâm sàng (chụp/đo/soi) đã chỉ định + 3) thuốc bác sĩ đã kê,
        // đều lấy qua bệnh án của lịch hẹn. Gộp theo id để cùng một mục ra MỘT dòng
        // (cộng dồn số lượng) — tránh dòng trùng mô tả khiến modal chặn khi lưu.
        java.util.LinkedHashMap<Long, InvoiceRequest.InvoiceItemRequest> labByService =
                new java.util.LinkedHashMap<>();
        java.util.LinkedHashMap<Long, InvoiceRequest.InvoiceItemRequest> medById =
                new java.util.LinkedHashMap<>();
        medicalRecordRepository.findByAppointmentId(appointmentId).ifPresent(emr -> {
            // 2) Xét nghiệm: mỗi lab order gắn một dịch vụ CLINICAL (chụp/đo/soi) có giá
            for (LabOrder lo : labOrderRepository.findByMedicalRecordIdOrderByCreatedAt(emr.getId())) {
                ClinicService svc = lo.getService();
                if (svc == null) continue; // đơn cũ không gắn dịch vụ thì bỏ qua
                if (labByService.containsKey(svc.getId())) continue;
                InvoiceRequest.InvoiceItemRequest item = new InvoiceRequest.InvoiceItemRequest();
                item.setItemType("LAB");
                item.setRefId(svc.getId());
                item.setDescription(svc.getServiceName());
                item.setQuantity(1);
                item.setUnitPrice(svc.getPrice() != null ? svc.getPrice() : BigDecimal.ZERO);
                labByService.put(svc.getId(), item);
            }

            // 3) Thuốc đã kê
            for (Prescription pres : prescriptionRepository.findByMedicalRecordId(emr.getId())) {
                // Bỏ đơn SKIPPED: thuốc không phát cho bệnh nhân thì không tính tiền
                if (pres.getStatus() == PrescriptionStatus.SKIPPED) continue;

                for (PrescriptionItem it : pres.getItems()) {
                    Medicine med = it.getMedicine();
                    if (med == null) continue;

                    int qty = it.getQuantity() != null ? it.getQuantity() : 1;
                    // Ưu tiên giá snapshot lúc kê; thiếu thì lấy giá hiện tại của thuốc
                    BigDecimal price = it.getUnitPrice() != null ? it.getUnitPrice()
                            : (med.getUnitPrice() != null ? med.getUnitPrice() : BigDecimal.ZERO);

                    InvoiceRequest.InvoiceItemRequest existing = medById.get(med.getId());
                    if (existing != null) {
                        existing.setQuantity(existing.getQuantity() + qty);
                    } else {
                        InvoiceRequest.InvoiceItemRequest item = new InvoiceRequest.InvoiceItemRequest();
                        item.setItemType("MEDICINE");
                        item.setRefId(med.getId());
                        item.setDescription(med.getName());
                        item.setQuantity(qty);
                        item.setUnitPrice(price);
                        medById.put(med.getId(), item);
                    }
                }
            }
        });
        suggestions.addAll(labByService.values());
        suggestions.addAll(medById.values());

        return suggestions;
    }

    /**
     * Phát hành hóa đơn sau khi thu tiền (BR-10).
     * Chuyển trạng thái → ISSUED + paymentStatus → PAID.
     */
    @Override
    @Transactional
    public InvoiceResponse issueInvoice(Long id, String paymentMethod, String paymentReference) {
        Invoice invoice = invoiceRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Hóa đơn không tồn tại: " + id));

        if (!"DRAFT".equals(invoice.getStatus())) {
            throw new IllegalStateException("Chỉ hóa đơn ở trạng thái DRAFT mới được phát hành");
        }

        // ThangNBHE201024 — chặn phát hành tay hóa đơn QR đang chờ ngân hàng (UC-22).
        // Hóa đơn QR nằm ở PENDING_PAYMENT: tiền chỉ được coi là đã thu khi cổng thanh toán
        // bắn webhook về (PaymentServiceImpl). Nếu vẫn cho gọi endpoint này với VIET_QR thì
        // lễ tân đánh dấu PAID được mà không cần ngân hàng xác nhận — đúng lỗ hổng mà cả
        // luồng webhook sinh ra để bịt.
        // Vẫn cho phép chuyển sang CASH: bệnh nhân bỏ QR quay lại trả tiền mặt là hợp lệ,
        // và khi đó có lễ tân cầm tiền chịu trách nhiệm.
        boolean waitingForBank = "PENDING_PAYMENT".equals(invoice.getPaymentStatus());
        String effectiveMethod = paymentMethod != null ? paymentMethod : invoice.getPaymentMethod();
        if (waitingForBank && "VIET_QR".equals(effectiveMethod)) {
            throw new IllegalStateException(
                    "Hóa đơn QR chỉ được xác nhận thanh toán bởi cổng ngân hàng. "
                            + "Nếu bệnh nhân trả tiền mặt, hãy phát hành lại với phương thức Tiền mặt.");
        }

        if (paymentMethod != null) {
            invoice.setPaymentMethod(paymentMethod);
        }
        if (paymentReference != null) {
            invoice.setPaymentReference(paymentReference);
        }

        invoice.setStatus("ISSUED");
        invoice.setPaymentStatus("PAID");
        invoice.setPaidAt(LocalDateTime.now());

        // UC-23 POST-3: khi hóa đơn đã thu tiền, đảm bảo lượt khám ở trạng thái COMPLETED.
        markAppointmentCompleted(invoice);

        return toResponseWithItems(invoiceRepository.save(invoice));
    }

    // UC-23 POST-3 — chốt lượt khám sang COMPLETED khi hóa đơn được thanh toán.
    // Thường lịch hẹn đã COMPLETED từ lúc bác sĩ khóa bệnh án; ở đây chỉ set bù cho
    // chắc chắn và không đụng vào lịch đã CANCELLED. Lịch hẹn đang nằm trong
    // persistence context nên thay đổi được flush tự động.
    private void markAppointmentCompleted(Invoice invoice) {
        Appointment appt = invoice.getAppointment();
        if (appt == null) return;
        if (appt.getStatus() != AppointmentStatus.CANCELLED
                && appt.getStatus() != AppointmentStatus.COMPLETED) {
            appt.setStatus(AppointmentStatus.COMPLETED);
        }
    }

    @Override
    @Transactional
    public InvoiceResponse cancelInvoice(Long id) {
        Invoice invoice = invoiceRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Hóa đơn không tồn tại: " + id));

        if ("ISSUED".equals(invoice.getStatus())) {
            throw new IllegalStateException("Không thể hủy hóa đơn đã phát hành");
        }

        if (!"DRAFT".equals(invoice.getStatus())) {
            throw new IllegalStateException("Chỉ hóa đơn ở trạng thái DRAFT mới được hủy");
        }

        invoice.setStatus("CANCELLED");
        return toResponseWithItems(invoiceRepository.save(invoice));
    }

    // Sinh mã hóa đơn INV-yyyyMMdd-XXXX (tăng dần trong ngày)
    private String generateInvoiceCode() {
        String dateStr = LocalDate.now().format(DateTimeFormatter.ofPattern("yyyyMMdd"));
        long count = invoiceRepository.countByDatePrefix(dateStr);
        return String.format("INV-%s-%04d", dateStr, count + 1);
    }

    private void notifyPaymentRequested(Invoice invoice) {
        Patient p = invoice.getPatient();
        if (p == null || p.getUser() == null) return;
        try {
            Long apptId = invoice.getAppointment() != null ? invoice.getAppointment().getId() : null;
            notificationService.createForUser(p.getUser().getId(),
                    "Bạn có hóa đơn " + invoice.getInvoiceCode()
                            + " cần thanh toán. Vào 'Hóa đơn của tôi' để quét mã QR.", apptId);
        } catch (Exception e) {
        }
    }

    // Chuyển Invoice entity → DTO (không kèm items) — dùng cho danh sách
    private InvoiceResponse toResponse(Invoice i) {
        Appointment appt = i.getAppointment();
        PatientServiceSubscription sub = i.getSubscription();
        String serviceName = null;
        if (appt != null && appt.getClinicService() != null) {
            serviceName = appt.getClinicService().getServiceName();
        } else if (sub != null && sub.getService() != null) {
            serviceName = sub.getService().getServiceName();
        }
        return InvoiceResponse.builder()
                .id(i.getId())
                .invoiceCode(i.getInvoiceCode())
                .appointmentId(appt != null ? appt.getId() : null)
                .subscriptionId(sub != null ? sub.getId() : null)
                .patientName(i.getPatient() != null ? i.getPatient().getFullName() : null)
                .patientPhone(i.getPatient() != null ? i.getPatient().getPhone() : null)
                .patientEmail(i.getPatient() != null ? i.getPatient().getEmail() : null)
                .patientCode(i.getPatient() != null ? i.getPatient().getPatientCode() : null)
                .doctorName(appt != null && appt.getDoctor() != null ? appt.getDoctor().getFullName() : null)
                .serviceName(serviceName)
                .appointmentTime(appt != null ? appt.getAppointmentTime() : null)
                .timeSlot(appt != null ? appt.getTimeSlot() : null)
                .items(List.of())
                .serviceFee(i.getServiceFee())
                .labFee(i.getLabFee())
                .medicineFee(i.getMedicineFee())
                .subTotal(i.getSubTotal())
                .discountAmount(i.getDiscountAmount())
                .totalAmount(i.getTotalAmount())
                .paymentMethod(i.getPaymentMethod())
                .paymentReference(i.getPaymentReference())
                .status(i.getStatus())
                .paymentStatus(i.getPaymentStatus())
                .emailStatus(i.getEmailStatus())
                .emailSentAt(i.getEmailSentAt())
                .issuedBy(i.getIssuedBy())
                .notes(i.getNotes())
                .paidAt(i.getPaidAt())
                .createdAt(i.getCreatedAt())
                .updatedAt(i.getUpdatedAt())
                .build();
    }

    /**
     * Chuẩn bị gửi hóa đơn điện tử (đồng bộ, nhanh).
     * Kiểm tra bệnh nhân có email và đánh dấu tình trạng gửi = SENDING.
     * Việc gửi SMTP thực tế do InvoiceMailDispatcher chạy nền để không treo
     * thread request (nguyên nhân "không nhận response" khi SMTP chậm).
     * Ném IllegalStateException nếu bệnh nhân chưa có email trong hồ sơ.
     */
    @Override
    @Transactional
    public void markEmailSending(Long id) {
        Invoice invoice = invoiceRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Hóa đơn không tồn tại: " + id));

        Patient patient = invoice.getPatient();
        if (patient == null || patient.getEmail() == null || patient.getEmail().isBlank()) {
            throw new IllegalStateException("Bệnh nhân chưa có địa chỉ email");
        }

        invoice.setEmailStatus("SENDING");
        invoiceRepository.save(invoice);
    }

    /**
     * Cập nhật tình trạng gửi email sau khi worker nền gửi xong.
     * status = SENT (kèm thời điểm gửi) hoặc FAILED (để lễ tân gửi lại).
     */
    @Override
    @Transactional
    public void markEmailStatus(Long id, String status) {
        Invoice invoice = invoiceRepository.findById(id).orElse(null);
        if (invoice == null) {
            return;
        }
        invoice.setEmailStatus(status);
        if ("SENT".equals(status)) {
            invoice.setEmailSentAt(LocalDateTime.now());
        }
        invoiceRepository.save(invoice);
    }

    // Xuất hóa đơn dạng byte[] PDF theo id — load từ DB rồi delegate
    @Override
    @Transactional(readOnly = true)
    public byte[] generateInvoicePdf(Long id) {
        return invoicePdfService.generate(getInvoiceById(id));
    }

    // Xuất PDF từ DTO đã load sẵn — dùng khi caller đã có InvoiceResponse để tránh load DB lần 2
    @Override
    public byte[] generateInvoicePdf(InvoiceResponse inv) {
        return invoicePdfService.generate(inv);
    }

    // Chuyển Invoice entity → DTO kèm đầy đủ items — dùng cho chi tiết, in, email
    private InvoiceResponse toResponseWithItems(Invoice i) {
        InvoiceResponse resp = toResponse(i);
        List<InvoiceResponse.InvoiceItemResponse> itemResponses = i.getItems().stream()
                .map(item -> InvoiceResponse.InvoiceItemResponse.builder()
                        .id(item.getId())
                        .itemType(item.getItemType())
                        .refId(item.getRefId())
                        .description(item.getDescription())
                        .quantity(item.getQuantity())
                        .unitPrice(item.getUnitPrice())
                        .subtotal(item.getSubTotal())
                        .build())
                .collect(Collectors.toList());
        resp.setItems(itemResponses);
        return resp;
    }

    @Override
    @Transactional(readOnly = true)
    public List<InvoiceResponse> getMyInvoices(Long patientId) {
        return invoiceRepository.findByPatientIdWithDetails(patientId)
                .stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }
}
