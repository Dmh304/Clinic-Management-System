package com.ecms.dto.request;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.math.BigDecimal;
import java.util.List;

/**
 * @author      ThangNB - HE201024
 * @contributor Đồng Mạnh Hùng - HE200743
 * @created     2026-05-31
 * @updated     2026-07-05
 *
 * Request payload submitted by the Receptionist to create an invoice for a
 * completed visit (UC-23 Process Payment, normal flow steps 4-6).
 *
 * Carries the itemised charge lines, an optional discount and the chosen
 * payment method. Server-side recalculation of the total happens in
 * InvoiceServiceImpl; the client never sends a total it computed itself.
 *
 * Business rules: BR-11 (invoice calculation), BR-15 (single discount per invoice).
 */
@Data
public class InvoiceRequest {

    /** Visit this invoice is billed against. Validate: required — an invoice
     *  can only exist for an appointment whose EMR is COMPLETED (UC-23 PRE-1). */
    @NotNull(message = "Lịch hẹn không được để trống")
    private Long appointmentId;

    /** Charge lines shown on the invoice. May be empty when the Receptionist
     *  starts from the suggested-items list and removes every row. */
    private List<InvoiceItemRequest> items;

    /** Discount applied by the Receptionist, in VND. Null is treated as zero.
     *  Validate: BR-11 (Total = exam + lab + medicine − discount) and
     *  BR-15 (at most one discount per invoice — a single amount field, not a list). */
    private BigDecimal discountAmount;

    /** Payment channel: CASH or VIET_QR (UC-23 ALT-1 / ALT-2). */
    private String paymentMethod;

    /** Bank transfer reference, filled for VIET_QR once the gateway confirms. */
    private String paymentReference;

    /** Free-text note printed on the invoice. */
    private String notes;

    /**
     * One itemised charge line of the invoice.
     * Mirrors the invoice_details table (see {@code InvoiceItem} entity).
     */
    @Data
    public static class InvoiceItemRequest {

        /** Charge category: SERVICE | MEDICINE | GLASSES | OTHER. */
        private String itemType;

        /** Polymorphic FK to the source row (service_id, medicine_id, ...),
         *  resolved by itemType at the service layer. */
        private Long refId;

        /** Line label printed on the invoice. */
        private String description;

        /** Units billed. Defaults to 1 at persist time when omitted. */
        private Integer quantity;

        /** Unit price in VND. Defaults to 0 at persist time when omitted. */
        private BigDecimal unitPrice;
    }
}
