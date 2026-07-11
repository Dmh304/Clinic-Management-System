package com.ecms.service.impl;

import com.ecms.dto.request.InvoiceRequest;
import com.ecms.dto.response.InvoiceResponse;
import com.ecms.entity.*;
import com.ecms.exception.ResourceNotFoundException;
import com.ecms.repository.AppointmentRepository;
import com.ecms.repository.InvoiceRepository;
import com.ecms.service.InvoiceService;
import com.ecms.service.InvoicePdfService;
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
                .paymentStatus("UNPAID")
                .notes(request.getNotes())
                .build();

        invoice.setItems(new ArrayList<>());
        for (InvoiceItem item : items) {
            item.setInvoice(invoice);
            invoice.getItems().add(item);
        }

        Invoice saved = invoiceRepository.save(invoice);
        return toResponseWithItems(saved);
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
