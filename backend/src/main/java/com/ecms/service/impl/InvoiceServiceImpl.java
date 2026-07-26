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
 * @author      ThangNB - HE201024
 * @contributor Đồng Mạnh Hùng - HE200743
 * @created     2026-07-11
 * @updated     2026-07-19
 *
 * Billing business logic for UC-23 (Process Payment) and UC-24 (Deliver Invoice):
 *  - build a DRAFT invoice with charge lines grouped into fee buckets
 *  - issue it (ISSUED / PAID) once cash or a bank transfer is collected
 *  - cancel an unissued draft
 *  - hand the e-invoice to the background mailer and render the PDF
 *
 * Enforced business rules:
 *  - BR-10 — an invoice only reaches PAID on a confirmed full payment; a
 *            VietQR invoice can be settled only by the gateway webhook
 *  - BR-11 — totalAmount = serviceFee + labFee + medicineFee − discount
 *  - BR-15 — a single discount amount per invoice
 *  - BR-09 — cancelling is a soft status change; nothing is ever deleted
 *  - one live invoice per visit; invoice codes run INV-yyyyMMdd-XXXX
 *
 * Note on numbering: some older comments in this module cited "UC-22" and
 * "BR-12" for payment and invoice calculation. Against the current SRS those
 * are UC-23 and BR-11 (UC-22 is Provide Live Support, BR-12 is Queue
 * Uniqueness); the references below use the current numbering.
 */
@Service
@RequiredArgsConstructor
public class InvoiceServiceImpl implements InvoiceService {

    private final InvoiceRepository invoiceRepository;
    private final AppointmentRepository appointmentRepository;
    private final MedicalRecordRepository medicalRecordRepository;
    private final PrescriptionRepository prescriptionRepository;
    private final LabOrderRepository labOrderRepository;
    private final NotificationService notificationService;
    private final InvoicePdfService invoicePdfService;

    /**
     * Lists every invoice without charge lines for the invoice-history table.
     *
     * @return all invoices, newest first
     */
    @Override
    @Transactional(readOnly = true)
    public List<InvoiceResponse> getAllInvoices() {
        return invoiceRepository.findAllWithDetails()
                .stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    /**
     * Searches invoices by patient name, phone or invoice code.
     *
     * @param keyword search term; blank or null falls back to the full list
     * @return matching invoices
     */
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

    /**
     * Loads one invoice with its charge lines, for the detail modal, the PDF
     * and the e-invoice email.
     *
     * @param id invoice primary key
     * @return the invoice including {@code items}
     * @throws ResourceNotFoundException if no invoice has that id
     */
    @Override
    @Transactional(readOnly = true)
    public InvoiceResponse getInvoiceById(Long id) {
        Invoice invoice = invoiceRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Hóa đơn không tồn tại: " + id));
        return toResponseWithItems(invoice);
    }

    /**
     * Finds the live invoice of a visit, so the dashboard can tell whether the
     * visit has already been billed.
     *
     * @param appointmentId visit primary key
     * @return the invoice with its charge lines
     * @throws ResourceNotFoundException if the visit has no live invoice
     *
     * Validate: UC-23 E1 — callers use this to load the existing invoice
     * rather than raising a duplicate.
     */
    @Override
    @Transactional(readOnly = true)
    public InvoiceResponse getInvoiceByAppointmentId(Long appointmentId) {
        Invoice invoice = invoiceRepository.findByAppointmentId(appointmentId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Không tìm thấy hóa đơn cho lịch hẹn: " + appointmentId));
        return toResponseWithItems(invoice);
    }

    /**
     * Creates a DRAFT invoice for a completed visit (UC-23 normal flow steps 2-6).
     *
     * Charge lines are bucketed into the three fee components of BR-11, the
     * discount is clamped, the total is derived server-side and an
     * INV-yyyyMMdd-XXXX code is generated.
     *
     * @param request charge lines, optional discount and payment method
     * @return the persisted invoice with its lines
     * @throws ResourceNotFoundException if the appointment does not exist
     * @throws IllegalStateException     if the visit already has a live invoice
     *
     * Validate: UC-23 E1 (no duplicate invoice per visit), BR-11 (total
     * formula), BR-15 (one discount), BR-10 (starts unpaid).
     */
    @Override
    @Transactional
    public InvoiceResponse createInvoice(InvoiceRequest request) {
        Appointment appointment = appointmentRepository.findById(request.getAppointmentId())
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Lịch hẹn không tồn tại: " + request.getAppointmentId()));

        // UC-23 E1: one live invoice per visit. CANCELLED rows are excluded so a
        // voided invoice (kept forever under BR-09) does not block a re-issue.
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

                // BR-11: every line lands in exactly one of the three fee
                // components (examination / lab / medicine) that make up the
                // total. Unknown types fall into labFee so no money is lost.
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
        // BR-15: a single discount amount, clamped to [0, subTotal] so the
        // total can never go negative or exceed the charges actually incurred.
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
                // BR-10 / UC-23 step 3: cash starts UNPAID (collected at the
                // counter), VietQR starts PENDING_PAYMENT and may only be
                // settled by the gateway webhook.
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

        // UC-23 step 3: a VietQR invoice notifies the patient that a payment is
        // due. A cash invoice does not — the patient is standing at the counter.
        if ("PENDING_PAYMENT".equals(saved.getPaymentStatus())) {
            notifyPaymentRequested(saved);
        }

        return toResponseWithItems(saved);
    }

    /**
     * Suggests the charge lines of a visit so the create-invoice modal opens
     * prefilled (UC-23 normal flow step 2).
     *
     * Sources, in priority order:
     *   0. If the visit previously had a CANCELLED invoice, its lines are
     *      restored verbatim — "cancel then re-create" must reproduce the
     *      original itemisation, including manual lines that cannot be derived
     *      from the appointment or the prescription.
     *   1. The consultation service booked on the appointment.
     *   2. Lab / imaging orders raised on the visit's EMR, each priced from its
     *      linked CLINICAL service.
     *   3. Medicines the Doctor prescribed, skipping SKIPPED prescriptions
     *      (not dispensed, therefore not billed — UC-39 ALT-1).
     *
     * Lines 2 and 3 are de-duplicated by id so a repeated item appears once
     * with an accumulated quantity, which also avoids the duplicate-description
     * error the modal raises on save.
     *
     * Read-only: nothing is persisted and the Receptionist can still edit,
     * remove or add lines before taking payment.
     *
     * @param appointmentId visit primary key
     * @return suggested charge lines, possibly empty
     * @throws ResourceNotFoundException if the appointment does not exist
     */
    @Override
    @Transactional(readOnly = true)
    public List<InvoiceRequest.InvoiceItemRequest> getSuggestedItems(Long appointmentId) {
        Appointment appointment = appointmentRepository.findById(appointmentId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Lịch hẹn không tồn tại: " + appointmentId));

        // Priority path — restore the lines of the most recent CANCELLED
        // invoice. BR-09 keeps that row around, which is exactly what makes
        // "cancel then re-create" lossless for manually entered charges.
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
                // UC-39 ALT-1: a SKIPPED prescription was never dispensed, so
                // it must not be billed.
                if (pres.getStatus() == PrescriptionStatus.SKIPPED) continue;

                for (PrescriptionItem it : pres.getItems()) {
                    Medicine med = it.getMedicine();
                    if (med == null) continue;

                    int qty = it.getQuantity() != null ? it.getQuantity() : 1;
                    // Prefer the price snapshotted when the drug was prescribed;
                    // fall back to today's catalogue price only if absent. This
                    // keeps a later catalogue edit from re-pricing an old visit
                    // (UC-58 assumption on non-retroactive price changes).
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
     * Issues an invoice once payment has been collected: DRAFT → ISSUED and
     * paymentStatus → PAID (UC-23 normal flow step 6, ALT-1 cash).
     *
     * @param id               invoice primary key
     * @param paymentMethod    CASH or VIET_QR; null keeps the stored method
     * @param paymentReference bank reference, null for cash
     * @return the issued invoice
     * @throws ResourceNotFoundException if no such invoice
     * @throws IllegalStateException     if the invoice is not DRAFT, or if a
     *         VietQR invoice awaiting the bank is being issued by hand
     *
     * Validate: BR-10 — payment must be confirmed before PAID is written, and
     * for VietQR only the gateway webhook may confirm it.
     */
    @Override
    @Transactional
    public InvoiceResponse issueInvoice(Long id, String paymentMethod, String paymentReference) {
        Invoice invoice = invoiceRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Hóa đơn không tồn tại: " + id));

        // Only an unissued draft can be issued — guards against double issuance.
        if (!"DRAFT".equals(invoice.getStatus())) {
            throw new IllegalStateException("Chỉ hóa đơn ở trạng thái DRAFT mới được phát hành");
        }

        // BR-10: a VietQR invoice is only settled by the gateway webhook
        // (PaymentServiceImpl). Allowing this endpoint to mark it PAID would let
        // a Receptionist confirm money the bank never reported — the exact hole
        // the webhook flow exists to close.
        //
        // PAYMENT_FAILED counts as "still awaiting the bank" just as much as
        // PENDING_PAYMENT does: it means a transfer arrived but was SHORT, so the
        // outstanding balance is real and must not be waved through here.
        // Omitting it would silently reopen the hole for every underpaid invoice.
        //
        // Switching to CASH stays legal in both states: the patient may abandon
        // the transfer and pay at the counter, and then a Receptionist is
        // accountable for the cash.
        String settlement = invoice.getPaymentStatus();
        boolean waitingForBank = "PENDING_PAYMENT".equals(settlement)
                || "PAYMENT_FAILED".equals(settlement);
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

    /**
     * Closes the visit out as COMPLETED once its invoice is paid (UC-23 POST-3).
     *
     * The appointment is usually already COMPLETED from when the Doctor locked
     * the EMR; this is a safety net. A CANCELLED appointment is left alone —
     * a cancelled visit must never be resurrected by a billing action.
     * The entity is managed here, so the change flushes with the transaction.
     *
     * @param invoice the invoice just settled
     */
    private void markAppointmentCompleted(Invoice invoice) {
        Appointment appt = invoice.getAppointment();
        if (appt == null) return;
        if (appt.getStatus() != AppointmentStatus.CANCELLED
                && appt.getStatus() != AppointmentStatus.COMPLETED) {
            appt.setStatus(AppointmentStatus.COMPLETED);
        }
    }

    /**
     * Voids an unissued invoice.
     *
     * @param id invoice primary key
     * @return the cancelled invoice
     * @throws ResourceNotFoundException if no such invoice
     * @throws IllegalStateException     if the invoice was already issued
     *
     * Validate: an ISSUED invoice is an accounting document and cannot be
     * cancelled; BR-09 — the row is only flagged CANCELLED, never deleted, so
     * its charge lines remain available to restore on a re-issue.
     */
    @Override
    @Transactional
    public InvoiceResponse cancelInvoice(Long id) {
        Invoice invoice = invoiceRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Hóa đơn không tồn tại: " + id));

        // An issued invoice has already been handed to the patient / accounted for.
        if ("ISSUED".equals(invoice.getStatus())) {
            throw new IllegalStateException("Không thể hủy hóa đơn đã phát hành");
        }

        if (!"DRAFT".equals(invoice.getStatus())) {
            throw new IllegalStateException("Chỉ hóa đơn ở trạng thái DRAFT mới được hủy");
        }

        // BR-09: soft cancel — the record stays in the table for the audit trail.
        invoice.setStatus("CANCELLED");
        return toResponseWithItems(invoiceRepository.save(invoice));
    }

    /**
     * Generates the next invoice code of the day, INV-yyyyMMdd-XXXX.
     * The sequence restarts each day and is derived from the count of codes
     * already sharing today's prefix.
     *
     * @return the generated invoice code
     */
    private String generateInvoiceCode() {
        String dateStr = LocalDate.now().format(DateTimeFormatter.ofPattern("yyyyMMdd"));
        long count = invoiceRepository.countByDatePrefix(dateStr);
        return String.format("INV-%s-%04d", dateStr, count + 1);
    }

    /**
     * Notifies the patient that a VietQR invoice is waiting to be paid
     * (UC-23 step 3, "the Patient is notified to pay"; UC-10 in-app notification).
     *
     * Silently skipped for a walk-in patient with no linked user account, and
     * best-effort overall — a notification failure must not roll back an
     * invoice that was created correctly.
     *
     * @param invoice the freshly created PENDING_PAYMENT invoice
     */
    private void notifyPaymentRequested(Invoice invoice) {
        Patient p = invoice.getPatient();
        if (p == null || p.getUser() == null) return;
        try {
            Long apptId = invoice.getAppointment() != null ? invoice.getAppointment().getId() : null;
            notificationService.createForUser(p.getUser().getId(),
                    "Bạn có hóa đơn " + invoice.getInvoiceCode()
                            + " cần thanh toán. Vào 'Hóa đơn của tôi' để quét mã QR.", apptId);
        } catch (Exception e) {
            // Best-effort: the invoice itself is already persisted.
        }
    }

    /**
     * Maps an {@link Invoice} entity to its DTO without charge lines —
     * the list projection.
     *
     * @param i invoice entity
     * @return DTO with an empty {@code items} list
     */
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
     * Fast synchronous half of the e-invoice email flow (UC-24): verifies the
     * patient has an email address and flags the invoice SENDING.
     *
     * The SMTP send itself is left to {@code InvoiceMailDispatcher} on a
     * background pool, so a slow mail server cannot hold the HTTP thread open.
     *
     * @param id invoice primary key
     * @throws ResourceNotFoundException if no such invoice
     * @throws IllegalStateException     if the patient has no email on file
     *
     * Validate: UC-24 PRE — an e-invoice cannot be delivered without a
     * recipient address, so this fails fast instead of queueing a doomed send.
     */
    @Override
    @Transactional
    public void markEmailSending(Long id) {
        Invoice invoice = invoiceRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Hóa đơn không tồn tại: " + id));

        // No recipient → nothing to send. Reject before flagging SENDING.
        Patient patient = invoice.getPatient();
        if (patient == null || patient.getEmail() == null || patient.getEmail().isBlank()) {
            throw new IllegalStateException("Bệnh nhân chưa có địa chỉ email");
        }

        invoice.setEmailStatus("SENDING");
        invoiceRepository.save(invoice);
    }

    /**
     * Records the delivery outcome reported by the background mail worker.
     *
     * @param id     invoice primary key; a vanished invoice is ignored rather
     *               than throwing, since this runs off the request thread
     * @param status SENT — stamps {@code emailSentAt}; FAILED — leaves the
     *               resend action available to the Receptionist (UC-24 E1)
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

    /**
     * Renders the invoice PDF by id (UC-24 ALT-1 print / ALT-2 download).
     *
     * @param id invoice primary key
     * @return PDF bytes
     */
    @Override
    @Transactional(readOnly = true)
    public byte[] generateInvoicePdf(Long id) {
        return invoicePdfService.generate(getInvoiceById(id));
    }

    /**
     * Renders the PDF from an already-loaded DTO, sparing a second query when
     * the caller has just fetched the invoice.
     *
     * @param inv invoice with its {@code items} populated
     * @return PDF bytes
     */
    @Override
    public byte[] generateInvoicePdf(InvoiceResponse inv) {
        return invoicePdfService.generate(inv);
    }

    /**
     * Maps an {@link Invoice} entity to its DTO including every charge line —
     * the detail projection used for the modal, the PDF and the email.
     *
     * @param i invoice entity with {@code items} loaded
     * @return fully populated DTO
     */
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

    /**
     * Returns one patient's own invoices for the portal list (UC-24 ALT-2).
     *
     * @param patientId the authenticated patient's id
     * @return that patient's invoices, newest first
     *
     * Validate: BR-08 — the query is filtered by patientId, and the caller
     * resolves that id from the JWT principal rather than the request, so no
     * patient can read another's billing record.
     */
    @Override
    @Transactional(readOnly = true)
    public List<InvoiceResponse> getMyInvoices(Long patientId) {
        return invoiceRepository.findByPatientIdWithDetails(patientId)
                .stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }
}
