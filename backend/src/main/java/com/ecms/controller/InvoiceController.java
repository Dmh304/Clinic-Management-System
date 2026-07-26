package com.ecms.controller;

import com.ecms.dto.request.InvoiceRequest;
import com.ecms.dto.response.ApiResponse;
import com.ecms.dto.response.InvoiceResponse;
import com.ecms.entity.Patient;
import com.ecms.entity.User;
import com.ecms.exception.ResourceNotFoundException;
import com.ecms.repository.PatientRepository;
import com.ecms.repository.UserRepository;
import com.ecms.service.InvoiceService;
import com.ecms.service.impl.InvoiceMailDispatcher;
import jakarta.validation.Valid;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * @author      ThangNB - HE201024
 * @contributor Đồng Mạnh Hùng - HE200743
 * @created     2026-07-11
 * @updated     2026-07-19
 *
 * REST entry point of the billing module.
 * Base URL: /api/v1/invoices
 *
 * KNOWN GAP — authorization: SecurityConfig declares no matcher for
 * {@code /api/v1/invoices/**}, so these endpoints fall through to
 * {@code anyRequest().authenticated()} and are reachable by ANY authenticated
 * role, including PATIENT, DOCTOR and NURSE. That means a patient can list
 * every patient's invoices via {@code GET /} and can call
 * {@code PATCH /{id}/issue}. This violates BR-08 (billing/EMR confidentiality)
 * and the UC-23 actor definition (Receptionist). Only {@code GET /my} is
 * genuinely safe, because it derives the patient id from the JWT.
 * Fix required: add a role matcher for this path, or @PreAuthorize per method.
 *
 * Implements UC-23 (Process Payment) and UC-24 (Deliver Invoice):
 *   GET    /                                        list invoices
 *   GET    /search?keyword=                         search by name / phone / code
 *   GET    /{id}                                    invoice detail with charge lines
 *   GET    /appointment/{id}                        invoice of a visit
 *   GET    /appointment/{id}/suggested-items        prefill data for the create form
 *   POST   /                                        create a DRAFT invoice
 *   PATCH  /{id}/issue                              collect payment, DRAFT → ISSUED
 *   PATCH  /{id}/cancel                             void a DRAFT invoice
 *   POST   /{id}/send-email                         e-mail the e-invoice
 *   GET    /my                                      signed-in patient's own invoices
 *   GET    /{id}/pdf                                download the invoice PDF
 *
 * Business rules: BR-08, BR-09, BR-10, BR-11, BR-15.
 */
@RestController
@RequestMapping("/api/v1/invoices")
@RequiredArgsConstructor
public class InvoiceController {

    private final InvoiceService invoiceService;
    private final InvoiceMailDispatcher invoiceMailDispatcher;
    private final UserRepository userRepository;
    private final PatientRepository patientRepository;

    /**
     * Lists every invoice without charge lines — backs the "Invoice history"
     * tab of the Receptionist screen.
     *
     * @return all invoices, newest first
     */
    @GetMapping
    public ResponseEntity<ApiResponse<List<InvoiceResponse>>> getAllInvoices() {
        return ResponseEntity.ok(ApiResponse.success(invoiceService.getAllInvoices()));
    }

    /**
     * Returns the invoices of the signed-in patient for the portal
     * "My Invoices" screen (UC-24 ALT-2).
     *
     * @param userDetails authenticated principal injected by Spring Security
     * @return that patient's invoices
     * @throws ResourceNotFoundException if the account has no patient profile
     *
     * Validate: BR-08 — the patient id is resolved from the JWT principal, not
     * from a request parameter, so a patient can never read someone else's
     * billing record by tampering with the URL.
     */
    @GetMapping("/my")
    public ResponseEntity<ApiResponse<List<InvoiceResponse>>> getMyInvoices(
            @AuthenticationPrincipal UserDetails userDetails) {
        User user = userRepository.findByEmail(userDetails.getUsername())
                .orElseThrow(() -> new ResourceNotFoundException("Người dùng không tồn tại"));
        Patient patient = patientRepository.findByUserId(user.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy hồ sơ bệnh nhân"));
        return ResponseEntity.ok(ApiResponse.success(invoiceService.getMyInvoices(patient.getId())));
    }

    /**
     * Searches invoices by patient name, patient phone or invoice code.
     *
     * @param keyword search term; when omitted the full list is returned
     */
    @GetMapping("/search")
    public ResponseEntity<ApiResponse<List<InvoiceResponse>>> searchInvoices(
            @RequestParam(required = false) String keyword) {
        return ResponseEntity.ok(ApiResponse.success(invoiceService.searchInvoices(keyword)));
    }

    /**
     * Returns one invoice with all charge lines — used by the detail modal,
     * the print preview and the e-invoice mailer.
     *
     * @param id invoice primary key
     */
    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<InvoiceResponse>> getInvoiceById(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success(invoiceService.getInvoiceById(id)));
    }

    /**
     * Returns the live invoice of a visit, or null when none exists.
     * The UI calls this before offering "create invoice".
     *
     * @param appointmentId visit primary key
     *
     * Validate: UC-23 E1 — lets the client load the existing invoice instead
     * of creating a duplicate for the same visit.
     */
    @GetMapping("/appointment/{appointmentId}")
    public ResponseEntity<ApiResponse<InvoiceResponse>> getInvoiceByAppointment(
            @PathVariable Long appointmentId) {
        return ResponseEntity.ok(
                ApiResponse.success(invoiceService.getInvoiceByAppointmentId(appointmentId)));
    }

    /**
     * Suggests the charge lines of a visit — the booked consultation service
     * plus the medicines the Doctor prescribed — so the create-invoice modal
     * opens prefilled and the Receptionist does not retype them
     * (UC-23 normal flow step 2). Read-only, creates nothing.
     *
     * @param appointmentId visit primary key
     * @return suggested charge lines
     */
    @GetMapping("/appointment/{appointmentId}/suggested-items")
    public ResponseEntity<ApiResponse<List<InvoiceRequest.InvoiceItemRequest>>> getSuggestedItems(
            @PathVariable Long appointmentId) {
        return ResponseEntity.ok(
                ApiResponse.success(invoiceService.getSuggestedItems(appointmentId)));
    }

    /**
     * Creates a DRAFT invoice from the lines entered by the Receptionist.
     *
     * @param request charge lines, optional discount, payment method
     * @return the created invoice (DRAFT / UNPAID)
     * @throws IllegalStateException when two Receptionists create an invoice at
     *         the same instant and the generated codes collide
     *
     * Validate: {@code @Valid} enforces appointmentId presence; the service
     * layer then applies BR-11 (total recomputed server-side) and BR-15
     * (a single discount). The unique index on invoice_code is what surfaces
     * the concurrent-creation collision handled here.
     */
    @PostMapping
    public ResponseEntity<ApiResponse<InvoiceResponse>> createInvoice(
            @Valid @RequestBody InvoiceRequest request) {
        try {
            return ResponseEntity.ok(ApiResponse.success(invoiceService.createInvoice(request)));
        } catch (DataIntegrityViolationException e) {
            throw new IllegalStateException("Mã hóa đơn bị trùng do tạo đồng thời, vui lòng thử lại");
        }
    }

    /**
     * Records payment and issues the invoice: DRAFT → ISSUED, UNPAID → PAID
     * (UC-23 normal flow step 6).
     *
     * @param id   invoice primary key
     * @param body payment method (CASH / VIET_QR) and optional bank reference
     * @return the issued invoice
     *
     * Validate: BR-10 — the service only flips paymentStatus to PAID for a
     * full payment. Emailing the e-invoice afterwards is best-effort: a mail
     * failure must not roll back a payment that was actually collected
     * (UC-24 E1 leaves the Receptionist a manual resend).
     */
    @PatchMapping("/{id}/issue")
    public ResponseEntity<ApiResponse<InvoiceResponse>> issueInvoice(
            @PathVariable Long id,
            @RequestBody(required = false) IssueRequest body) {
        String method = body != null ? body.getPaymentMethod() : null;
        String ref = body != null ? body.getPaymentReference() : null;
        InvoiceResponse issued = invoiceService.issueInvoice(id, method, ref);

        // UC-24 normal flow: e-mail the e-invoice as soon as payment is taken.
        // BR-10 guard — only a PAID invoice is worth sending.
        if ("PAID".equals(issued.getPaymentStatus())
                && issued.getPatientEmail() != null && !issued.getPatientEmail().isBlank()) {
            try {
                invoiceService.markEmailSending(id);
                invoiceMailDispatcher.dispatch(id);
            } catch (Exception ignored) {
                // Swallowed on purpose: the payment already succeeded. UC-24 E1 —
                // the Receptionist can resend or print manually.
            }
        }
        return ResponseEntity.ok(ApiResponse.success(issued));
    }

    /**
     * Voids an invoice.
     *
     * @param id invoice primary key
     * @return the cancelled invoice
     *
     * Validate: only a DRAFT invoice may be cancelled (checked in the service),
     * and BR-09 — the row is flagged CANCELLED, never physically deleted.
     */
    @PatchMapping("/{id}/cancel")
    public ResponseEntity<ApiResponse<InvoiceResponse>> cancelInvoice(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success(invoiceService.cancelInvoice(id)));
    }

    /**
     * Sends the e-invoice to the patient by email (UC-24 ALT / manual resend).
     *
     * Returns as soon as the invoice is flagged SENDING; the SMTP send runs on
     * the background mail pool so a slow Gmail handshake never blocks the HTTP
     * thread. The final SENT / FAILED outcome is written by the worker.
     *
     * @param id invoice primary key
     * @throws IllegalStateException if the patient has no email on file
     */
    @PostMapping("/{id}/send-email")
    public ResponseEntity<ApiResponse<Void>> sendEmail(@PathVariable Long id) {
        invoiceService.markEmailSending(id);
        invoiceMailDispatcher.dispatch(id);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    /**
     * Streams the invoice as a PDF for printing or download
     * (UC-24 ALT-1 print, ALT-2 patient download).
     * Served inline so the browser renders it instead of forcing a save.
     *
     * @param id invoice primary key
     * @return PDF bytes with a hoa-don-{code}.pdf filename
     */
    @GetMapping("/{id}/pdf")
    public ResponseEntity<byte[]> downloadPdf(@PathVariable Long id) {
        InvoiceResponse inv = invoiceService.getInvoiceById(id);
        byte[] pdf = invoiceService.generateInvoicePdf(inv);
        String filename = "hoa-don-" + inv.getInvoiceCode() + ".pdf";
        return ResponseEntity.ok()
                .contentType(MediaType.APPLICATION_PDF)
                .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"" + filename + "\"")
                .body(pdf);
    }

    /** Inline body of {@code PATCH /{id}/issue}: how the payment was taken. */
    @Data
    public static class IssueRequest {
        private String paymentMethod;
        private String paymentReference;
    }
}
