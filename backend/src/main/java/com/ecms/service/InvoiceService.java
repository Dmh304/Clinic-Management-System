package com.ecms.service;

import com.ecms.dto.request.InvoiceRequest;
import com.ecms.dto.response.InvoiceResponse;

import java.util.List;

/**
 * @author      ThangNB - HE201024
 * @contributor Đồng Mạnh Hùng - HE200743
 * @created     2026-05-31
 * @updated     2026-07-18
 *
 * Billing business contract: invoice creation, issuance, cancellation,
 * PDF rendering and e-invoice email delivery.
 * Covers UC-23 (Process Payment) and UC-24 (Deliver Invoice).
 * Implemented by {@code InvoiceServiceImpl}.
 */
public interface InvoiceService {

    /**
     * Lists every invoice without its charge lines — the lightweight
     * projection used by the Receptionist invoice list screen.
     *
     * @return invoices newest first, {@code items} left empty
     */
    List<InvoiceResponse> getAllInvoices();

    /**
     * Searches invoices by patient name, phone number or invoice code.
     *
     * @param keyword free-text term; blank returns the full list
     * @return matching invoices
     */
    List<InvoiceResponse> searchInvoices(String keyword);

    /**
     * Loads one invoice with all of its charge lines populated.
     *
     * @param id invoice primary key
     * @return the invoice including {@code items}
     * @throws com.ecms.exception.ResourceNotFoundException if no such invoice
     */
    InvoiceResponse getInvoiceById(Long id);

    /**
     * Finds the invoice already raised for a visit, used to prevent a
     * duplicate invoice being created for the same appointment.
     *
     * @param appointmentId visit primary key
     * @return the existing invoice, or {@code null} when the visit has none
     *
     * Validate: UC-23 E1 — on a duplicate, the caller loads this invoice
     * instead of creating a second one.
     */
    InvoiceResponse getInvoiceByAppointmentId(Long appointmentId);

    /**
     * Creates a DRAFT invoice from a visit and its itemised charges.
     *
     * @param request charge lines, optional discount and payment method
     * @return the persisted invoice (status DRAFT, paymentStatus UNPAID)
     *
     * Validate: BR-10 (an invoice starts UNPAID and only becomes PAID on full
     * payment), BR-11 (total is recomputed server-side from the lines minus
     * the discount), BR-15 (a single discount amount per invoice).
     */
    InvoiceResponse createInvoice(InvoiceRequest request);

    /**
     * Suggests the charge lines for a visit — the booked consultation service
     * plus the medicines the Doctor prescribed — so the Receptionist does not
     * retype them. Read-only: no invoice is created (UC-23 normal flow step 2).
     *
     * @param appointmentId visit primary key
     * @return suggested lines, ready to prefill the create-invoice form
     */
    List<InvoiceRequest.InvoiceItemRequest> getSuggestedItems(Long appointmentId);

    /**
     * Promotes an invoice DRAFT → ISSUED once payment has been collected.
     *
     * @param id               invoice primary key
     * @param paymentMethod    CASH or VIET_QR
     * @param paymentReference bank transfer reference for VIET_QR, may be null for CASH
     * @return the issued invoice
     *
     * Validate: BR-10 — issuance is only allowed when the full amount is
     * settled; a short payment leaves the invoice untouched (UC-23 E2).
     */
    InvoiceResponse issueInvoice(Long id, String paymentMethod, String paymentReference);

    /**
     * Cancels an invoice by flipping its status to CANCELLED.
     *
     * @param id invoice primary key
     * @return the cancelled invoice
     *
     * Validate: BR-09 (No Hard Delete — the row is retained for the audit
     * trail, never removed) and only a DRAFT invoice may be cancelled.
     */
    InvoiceResponse cancelInvoice(Long id);

    /**
     * Fast synchronous half of the e-invoice email flow: verifies the patient
     * has an email address and flags the invoice as SENDING. The SMTP send
     * itself runs in the background via {@code InvoiceMailDispatcher} so the
     * HTTP request is not blocked (UC-24).
     *
     * @param id invoice primary key
     * @throws IllegalStateException if the patient has no email address on file
     */
    void markEmailSending(Long id);

    /**
     * Records the outcome reported by the background mail worker.
     *
     * @param id     invoice primary key
     * @param status SENT or FAILED — FAILED is what surfaces the resend
     *               button described in UC-24 E1
     */
    void markEmailStatus(Long id, String status);

    /**
     * Renders the invoice as a PDF, loading it from the database first.
     *
     * @param id invoice primary key
     * @return PDF bytes
     */
    byte[] generateInvoicePdf(Long id);

    /**
     * Renders an already-loaded invoice as a PDF, avoiding a second query.
     *
     * @param inv invoice projection with its {@code items} populated
     * @return PDF bytes
     */
    byte[] generateInvoicePdf(InvoiceResponse inv);

    /**
     * Lists the signed-in patient's own invoices for the portal
     * "My Invoices" screen.
     *
     * @param patientId the authenticated patient's id
     * @return that patient's invoices only
     *
     * Validate: BR-08 — results are scoped to the owning patient so no one
     * can read another patient's billing record.
     */
    List<InvoiceResponse> getMyInvoices(Long patientId);
}
