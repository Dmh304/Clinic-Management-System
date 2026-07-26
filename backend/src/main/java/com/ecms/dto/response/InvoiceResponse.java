package com.ecms.dto.response;

import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

/**
 * @author      ThangNB - HE201024
 * @contributor Đồng Mạnh Hùng - HE200743
 * @created     2026-05-31
 * @updated     2026-07-11
 *
 * Invoice projection returned to every client of the billing module:
 * the Receptionist invoice screen (UC-23), the invoice delivery actions
 * (UC-24) and the patient portal "My Invoices" list (UC-24 ALT-2).
 *
 * {@code patientEmail} is included so the e-invoice email action can run
 * without a second lookup, and {@code emailStatus} lets the UI show delivery
 * progress and offer a resend (UC-24 E1 — retry on delivery failure).
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class InvoiceResponse {

    private Long id;
    /** Human-readable invoice number, format INV-yyyyMMdd-XXXX. */
    private String invoiceCode;

    /** Visit this invoice bills. */
    private Long appointmentId;

    // ── Patient snapshot: shown on screen and used by the e-invoice mailer ──
    private String patientName;
    private String patientPhone;
    private String patientEmail;
    private String patientCode;
    private String doctorName;
    private String serviceName;
    private LocalDateTime appointmentTime;
    private String timeSlot;

    /** Charge lines. Empty on list endpoints (getAllInvoices), fully
     *  populated on the detail endpoint (getInvoiceById). */
    private List<InvoiceItemResponse> items;

    // ── Charge totals, grouped per BR-11 (Total = exam + lab + medicine − discount) ──
    private BigDecimal serviceFee;
    private BigDecimal labFee;
    private BigDecimal medicineFee;
    private BigDecimal subTotal;
    private BigDecimal discountAmount;
    private BigDecimal totalAmount;

    // ── Payment state ──
    private String paymentMethod;   // CASH | VIET_QR
    private String paymentReference;
    private String status;          // DRAFT | ISSUED | CANCELLED
    /** Settlement state. Reaches PAID only on full payment (BR-10). */
    private String paymentStatus;   // UNPAID | PAID | PAYMENT_FAILED

    // ── E-invoice email delivery state, drives the resend button in the UI ──
    private String emailStatus;     // NOT_SENT | SENDING | SENT | FAILED
    private LocalDateTime emailSentAt;

    private Long issuedBy;
    private String notes;
    private LocalDateTime paidAt;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    /** One charge line of the invoice, mirroring the invoice_details table. */
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class InvoiceItemResponse {
        private Long id;
        private String itemType;   // SERVICE | MEDICINE | GLASSES | LAB | OTHER
        private Long refId;
        private String description;
        private Integer quantity;
        private BigDecimal unitPrice;
        /** Line total = quantity × unitPrice. */
        private BigDecimal subtotal;
    }
}
