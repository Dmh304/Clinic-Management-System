package com.ecms.service.impl;

import com.ecms.dto.request.InvoiceRequest;
import com.ecms.dto.response.InvoiceResponse;
import com.ecms.entity.*;
import com.ecms.exception.ResourceNotFoundException;
import com.ecms.repository.AppointmentRepository;
import com.ecms.repository.InvoiceRepository;
import com.ecms.repository.LabOrderRepository;
import com.ecms.repository.MedicalRecordRepository;
import com.ecms.repository.PrescriptionRepository;
import com.ecms.service.InvoiceService;
import com.ecms.service.InvoicePdfService;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import jakarta.mail.internet.MimeMessage;
import java.math.BigDecimal;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.text.NumberFormat;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
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
    // ThangNBHE201024 — gợi ý khoản phí: lấy thuốc bác sĩ đã kê theo bệnh án của lịch hẹn
    private final MedicalRecordRepository medicalRecordRepository;
    private final PrescriptionRepository prescriptionRepository;
    // Lấy xét nghiệm/cận lâm sàng (chụp/đo/soi) đã chỉ định để đưa vào hóa đơn
    private final LabOrderRepository labOrderRepository;
    // Gửi thông báo "Yêu cầu thanh toán" cho bệnh nhân (UC-22)
    private final com.ecms.service.NotificationService notificationService;

    // Thông tin tài khoản nhận tiền — để sinh mã QR VietQR trong email hóa đơn chưa thanh toán
    @Value("${payment.bank.id:970436}")
    private String bankId;
    @Value("${payment.bank.account:1234567890}")
    private String bankAccount;
    @Value("${payment.bank.account-name:PHONG KHAM MAT}")
    private String bankAccountName;
    // Dùng để gửi email HTML khi lễ tân hoặc bệnh nhân yêu cầu gửi hóa đơn
    private final JavaMailSender mailSender;
    private final InvoicePdfService invoicePdfService;

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
     * Tạo hóa đơn nháp (DRAFT) cho một lịch hẹn đã hoàn thành.
     * Tự động tính tổng phí theo từng nhóm dịch vụ (BR-12).
     * Mã hóa đơn được sinh tự động dạng INV-yyyyMMdd-XXXX.
     */
    @Override
    @Transactional
    public InvoiceResponse createInvoice(InvoiceRequest request) {
        Appointment appointment = appointmentRepository.findById(request.getAppointmentId())
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Lịch hẹn không tồn tại: " + request.getAppointmentId()));

        if (invoiceRepository.existsByAppointment_IdAndStatusNot(request.getAppointmentId(), "CANCELLED")) {
            throw new IllegalStateException("Lịch hẹn này đã có hóa đơn");
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
        // Giới hạn discount trong [0, subTotal] để tổng tiền không âm và không vượt quá phí.
        BigDecimal discount = request.getDiscountAmount() != null
                ? request.getDiscountAmount()
                : BigDecimal.ZERO;
        if (discount.compareTo(BigDecimal.ZERO) < 0) {
            discount = BigDecimal.ZERO;
        } else if (discount.compareTo(subTotal) > 0) {
            discount = subTotal;
        }
        BigDecimal total = subTotal.subtract(discount);

        Invoice invoice = Invoice.builder()
                .appointment(appointment)
                .patient(appointment.getPatient())
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
                // ThangNBHE201024 — hóa đơn QR nằm ở PENDING_PAYMENT ngay khi tạo: mã QR đã
                // đưa cho bệnh nhân quét, hệ thống đang chờ cổng thanh toán báo tiền về.
                // Chỉ webhook mới được đẩy sang PAID (xem PaymentServiceImpl).
                // Hóa đơn tiền mặt giữ UNPAID cho đến khi lễ tân phát hành.
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

        return toResponseWithItems(invoiceRepository.save(invoice));
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

    // Chuyển Invoice entity → DTO (không kèm items) — dùng cho danh sách
    private InvoiceResponse toResponse(Invoice i) {
        Appointment appt = i.getAppointment();
        return InvoiceResponse.builder()
                .id(i.getId())
                .invoiceCode(i.getInvoiceCode())
                .appointmentId(appt != null ? appt.getId() : null)
                .patientName(i.getPatient() != null ? i.getPatient().getFullName() : null)
                .patientPhone(i.getPatient() != null ? i.getPatient().getPhone() : null)
                .patientEmail(i.getPatient() != null ? i.getPatient().getEmail() : null)
                .patientCode(i.getPatient() != null ? i.getPatient().getPatientCode() : null)
                .doctorName(appt != null && appt.getDoctor() != null ? appt.getDoctor().getFullName() : null)
                .serviceName(appt != null && appt.getClinicService() != null
                        ? appt.getClinicService().getServiceName() : null)
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
                .issuedBy(i.getIssuedBy())
                .notes(i.getNotes())
                .paidAt(i.getPaidAt())
                .createdAt(i.getCreatedAt())
                .updatedAt(i.getUpdatedAt())
                .build();
    }

    /**
     * Gửi hóa đơn điện tử qua email đến bệnh nhân.
     * Tạo MimeMessage với nội dung HTML được sinh bởi buildEmailHtml().
     * Ném IllegalStateException nếu bệnh nhân chưa có email trong hồ sơ.
     */
    @Override
    @Transactional(readOnly = true)
    public void sendInvoiceEmail(Long id) {
        Invoice invoice = invoiceRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Hóa đơn không tồn tại: " + id));

        Patient patient = invoice.getPatient();
        if (patient == null || patient.getEmail() == null || patient.getEmail().isBlank()) {
            throw new IllegalStateException("Bệnh nhân chưa có địa chỉ email");
        }

        // Hóa đơn chưa thanh toán → email là "yêu cầu thanh toán" kèm mã QR; đã thanh toán
        // → email là "biên nhận". Đổi tiêu đề cho khớp nội dung.
        boolean unpaid = !"PAID".equals(invoice.getPaymentStatus());
        String subject = unpaid
                ? "Yêu cầu thanh toán hóa đơn - " + invoice.getInvoiceCode()
                : "Hóa đơn khám bệnh - " + invoice.getInvoiceCode();

        try {
            MimeMessage mime = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(mime, true, "UTF-8");
            helper.setTo(patient.getEmail());
            helper.setSubject(subject);
            helper.setText(buildEmailHtml(invoice, unpaid), true);
            mailSender.send(mime);
        } catch (Exception e) {
            throw new RuntimeException("Không thể gửi email: " + e.getMessage(), e);
        }
    }

    // Gửi thông báo "Yêu cầu thanh toán" vào chuông của bệnh nhân (nếu có tài khoản).
    // Tách riêng, KHÔNG phụ thuộc email/SMTP — gọi ngay khi tạo hóa đơn QR để bệnh nhân
    // vào "Hóa đơn của tôi" quét mã trả tiền. Lỗi tạo thông báo không được chặn luồng chính.
    private void notifyPaymentRequested(Invoice invoice) {
        Patient p = invoice.getPatient();
        if (p == null || p.getUser() == null) return;
        try {
            Long apptId = invoice.getAppointment() != null ? invoice.getAppointment().getId() : null;
            notificationService.createForUser(p.getUser().getId(),
                    "Bạn có hóa đơn " + invoice.getInvoiceCode()
                            + " cần thanh toán. Vào 'Hóa đơn của tôi' để quét mã QR.", apptId);
        } catch (Exception e) {
            // Bỏ qua nếu tạo thông báo lỗi
        }
    }

    // Sinh URL mã QR VietQR (chuẩn Napas) cho một hóa đơn — bệnh nhân quét để chuyển khoản.
    // Nội dung chuyển khoản BẮT BUỘC bắt đầu bằng "SEVQR" (yêu cầu của SePay + VietinBank để
    // nhận được biến động số dư) và chứa mã hóa đơn để webhook đối soát tự động (UC-22).
    private String buildVietQrUrl(Invoice inv) {
        String content = "SEVQR " + inv.getInvoiceCode();
        long amount = inv.getTotalAmount() != null ? inv.getTotalAmount().longValue() : 0L;
        return "https://img.vietqr.io/image/" + bankId + "-" + bankAccount + "-compact2.png"
                + "?amount=" + amount
                + "&addInfo=" + URLEncoder.encode(content, StandardCharsets.UTF_8)
                + "&accountName=" + URLEncoder.encode(bankAccountName, StandardCharsets.UTF_8);
    }

    // Tạo nội dung email HTML với bảng chi tiết khoản phí và tổng tiền.
    // unpaid = true → chèn thêm khối mã QR + thông tin chuyển khoản để bệnh nhân thanh toán.
    private String buildEmailHtml(Invoice inv, boolean unpaid) {
        NumberFormat vnd = NumberFormat.getInstance(new Locale("vi", "VN"));
        DateTimeFormatter dtf = DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm");
        Appointment appt = inv.getAppointment();

        // Khối QR chỉ hiện khi hóa đơn chưa thanh toán
        String qrBlock = "";
        if (unpaid) {
            String qrUrl = buildVietQrUrl(inv);
            String content = "SEVQR " + inv.getInvoiceCode();
            qrBlock = "<div style='margin:8px 0 20px;padding:20px;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;text-align:center'>"
                    + "<h3 style='margin:0 0 12px;color:#15803d;font-size:16px'>Quét mã QR để thanh toán</h3>"
                    + "<img src='" + qrUrl + "' alt='VietQR' width='240' height='240' style='display:block;margin:0 auto 12px;border-radius:8px' />"
                    + "<table style='width:100%;font-size:13px;color:#374151'>"
                    + "<tr><td style='padding:2px 0;text-align:left'>Ngân hàng (mã):</td><td style='padding:2px 0;text-align:right'><strong>" + bankId + "</strong></td></tr>"
                    + "<tr><td style='padding:2px 0;text-align:left'>Số tài khoản:</td><td style='padding:2px 0;text-align:right'><strong>" + bankAccount + "</strong></td></tr>"
                    + "<tr><td style='padding:2px 0;text-align:left'>Chủ tài khoản:</td><td style='padding:2px 0;text-align:right'><strong>" + bankAccountName + "</strong></td></tr>"
                    + "<tr><td style='padding:2px 0;text-align:left'>Số tiền:</td><td style='padding:2px 0;text-align:right'><strong style='color:#10b981'>" + vnd.format(inv.getTotalAmount()) + "₫</strong></td></tr>"
                    + "<tr><td style='padding:2px 0;text-align:left'>Nội dung CK:</td><td style='padding:2px 0;text-align:right'><strong>" + content + "</strong></td></tr>"
                    + "</table>"
                    + "<p style='margin:12px 0 0;font-size:12px;color:#64748b'>Vui lòng giữ nguyên nội dung chuyển khoản để hệ thống tự xác nhận thanh toán.</p>"
                    + "</div>";
        }

        StringBuilder items = new StringBuilder();
        for (InvoiceItem item : inv.getItems()) {
            items.append("<tr>")
                 .append("<td style='padding:6px 8px;border-bottom:1px solid #e2e8f0'>").append(item.getDescription()).append("</td>")
                 .append("<td style='padding:6px 8px;border-bottom:1px solid #e2e8f0;text-align:center'>").append(item.getQuantity()).append("</td>")
                 .append("<td style='padding:6px 8px;border-bottom:1px solid #e2e8f0;text-align:right'>").append(vnd.format(item.getUnitPrice())).append("₫</td>")
                 .append("<td style='padding:6px 8px;border-bottom:1px solid #e2e8f0;text-align:right'>").append(vnd.format(item.getSubTotal())).append("₫</td>")
                 .append("</tr>");
        }

        return "<!DOCTYPE html><html><head><meta charset='UTF-8'></head><body style='font-family:Arial,sans-serif;color:#1e293b;margin:0;padding:0'>"
             + "<div style='max-width:600px;margin:24px auto;border:1px solid #e2e8f0;border-radius:8px;overflow:hidden'>"
             + "<div style='background:#4f46e5;color:#fff;padding:24px 32px'>"
             + "<h2 style='margin:0;font-size:20px'>" + (unpaid ? "Yêu cầu thanh toán hóa đơn" : "Hóa đơn khám bệnh") + "</h2>"
             + "<p style='margin:4px 0 0;opacity:.85'>Mã hóa đơn: <strong>" + inv.getInvoiceCode() + "</strong></p></div>"
             + "<div style='padding:24px 32px'>"
             + "<table style='width:100%;margin-bottom:16px'><tr>"
             + "<td><strong>Bệnh nhân:</strong> " + (inv.getPatient() != null ? inv.getPatient().getFullName() : "") + "<br>"
             + "<strong>SĐT:</strong> " + (inv.getPatient() != null ? inv.getPatient().getPhone() : "") + "</td>"
             + "<td style='text-align:right'><strong>Bác sĩ:</strong> " + (appt != null && appt.getDoctor() != null ? appt.getDoctor().getFullName() : "—") + "<br>"
             + "<strong>Ngày thanh toán:</strong> " + (inv.getPaidAt() != null ? inv.getPaidAt().format(dtf) : "—") + "</td>"
             + "</tr></table>"
             + "<table style='width:100%;border-collapse:collapse;margin-bottom:16px'>"
             + "<thead><tr style='background:#f8fafc'>"
             + "<th style='padding:8px;text-align:left;border-bottom:2px solid #e2e8f0'>Dịch vụ / Thuốc</th>"
             + "<th style='padding:8px;text-align:center;border-bottom:2px solid #e2e8f0'>SL</th>"
             + "<th style='padding:8px;text-align:right;border-bottom:2px solid #e2e8f0'>Đơn giá</th>"
             + "<th style='padding:8px;text-align:right;border-bottom:2px solid #e2e8f0'>Thành tiền</th>"
             + "</tr></thead><tbody>" + items + "</tbody></table>"
             + "<div style='text-align:right;padding:12px 0;border-top:2px solid #e2e8f0'>"
             + (inv.getDiscountAmount() != null && inv.getDiscountAmount().compareTo(BigDecimal.ZERO) > 0
                    ? "<div style='color:#64748b;font-size:14px;margin-bottom:4px'>Tạm tính: " + vnd.format(inv.getSubTotal()) + "₫</div>"
                      + "<div style='color:#dc2626;font-size:14px;margin-bottom:6px'>Giảm giá: −" + vnd.format(inv.getDiscountAmount()) + "₫</div>"
                    : "")
             + "<span style='font-size:18px;font-weight:700;color:#10b981'>" + (unpaid ? "Số tiền cần thanh toán: " : "Tổng cộng: ") + vnd.format(inv.getTotalAmount()) + "₫</span></div>"
             + qrBlock
             + (unpaid ? "" : "<p style='color:#64748b;font-size:13px'>Phương thức: " + ("CASH".equals(inv.getPaymentMethod()) ? "Tiền mặt" : "QR Code") + "</p>")
             + "</div>"
             + "<div style='background:#f8fafc;padding:16px 32px;text-align:center;color:#64748b;font-size:13px'>"
             + "Cảm ơn quý khách đã tin tưởng sử dụng dịch vụ của chúng tôi.</div></div>"
             + "</body></html>";
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
