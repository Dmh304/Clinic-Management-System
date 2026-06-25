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
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import jakarta.mail.internet.MimeMessage;
import java.math.BigDecimal;
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

        if (invoiceRepository.existsByAppointment_Id(request.getAppointmentId())) {
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
                        .subtotal(subtotal)
                        .build();
                items.add(item);

                String type = item.getItemType();
                if ("SERVICE".equals(type)) {
                    serviceFee = serviceFee.add(subtotal);
                } else if ("MEDICINE".equals(type) || "GLASSES".equals(type)) {
                    medicineFee = medicineFee.add(subtotal);
                } else {
                    labFee = labFee.add(subtotal);
                }
            }
        }

        BigDecimal total = serviceFee.add(labFee).add(medicineFee);

        Invoice invoice = Invoice.builder()
                .appointment(appointment)
                .patient(appointment.getPatient())
                .invoiceCode(generateInvoiceCode())
                .serviceFee(serviceFee)
                .labFee(labFee)
                .medicineFee(medicineFee)
                .totalAmount(total)
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
     * Gửi hóa đơn điện tử qua email đến bệnh nhân (UC-17).
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

        try {
            MimeMessage mime = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(mime, true, "UTF-8");
            helper.setTo(patient.getEmail());
            helper.setSubject("Hóa đơn khám bệnh - " + invoice.getInvoiceCode());
            helper.setText(buildEmailHtml(invoice), true);
            mailSender.send(mime);
        } catch (Exception e) {
            throw new RuntimeException("Không thể gửi email: " + e.getMessage(), e);
        }
    }

    // Tạo nội dung email HTML với bảng chi tiết khoản phí và tổng tiền
    private String buildEmailHtml(Invoice inv) {
        NumberFormat vnd = NumberFormat.getInstance(new Locale("vi", "VN"));
        DateTimeFormatter dtf = DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm");
        Appointment appt = inv.getAppointment();

        StringBuilder items = new StringBuilder();
        for (InvoiceItem item : inv.getItems()) {
            items.append("<tr>")
                 .append("<td style='padding:6px 8px;border-bottom:1px solid #e2e8f0'>").append(item.getDescription()).append("</td>")
                 .append("<td style='padding:6px 8px;border-bottom:1px solid #e2e8f0;text-align:center'>").append(item.getQuantity()).append("</td>")
                 .append("<td style='padding:6px 8px;border-bottom:1px solid #e2e8f0;text-align:right'>").append(vnd.format(item.getUnitPrice())).append("₫</td>")
                 .append("<td style='padding:6px 8px;border-bottom:1px solid #e2e8f0;text-align:right'>").append(vnd.format(item.getSubtotal())).append("₫</td>")
                 .append("</tr>");
        }

        return "<!DOCTYPE html><html><head><meta charset='UTF-8'></head><body style='font-family:Arial,sans-serif;color:#1e293b;margin:0;padding:0'>"
             + "<div style='max-width:600px;margin:24px auto;border:1px solid #e2e8f0;border-radius:8px;overflow:hidden'>"
             + "<div style='background:#4f46e5;color:#fff;padding:24px 32px'>"
             + "<h2 style='margin:0;font-size:20px'>Hóa đơn khám bệnh</h2>"
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
             + "<span style='font-size:18px;font-weight:700;color:#10b981'>Tổng cộng: " + vnd.format(inv.getTotalAmount()) + "₫</span></div>"
             + "<p style='color:#64748b;font-size:13px'>Phương thức: " + ("CASH".equals(inv.getPaymentMethod()) ? "Tiền mặt" : "QR Code") + "</p>"
             + "</div>"
             + "<div style='background:#f8fafc;padding:16px 32px;text-align:center;color:#64748b;font-size:13px'>"
             + "Cảm ơn quý khách đã tin tưởng sử dụng dịch vụ của chúng tôi.</div></div>"
             + "</body></html>";
    }

    // Xuất hóa đơn dạng byte[] PDF — delegate sang InvoicePdfService
    @Override
    @Transactional(readOnly = true)
    public byte[] generateInvoicePdf(Long id) {
        InvoiceResponse inv = getInvoiceById(id);
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
                        .subtotal(item.getSubtotal())
                        .build())
                .collect(Collectors.toList());
        resp.setItems(itemResponses);
        return resp;
    }
}
