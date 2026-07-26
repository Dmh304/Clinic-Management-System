package com.ecms.entity;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

/**
 * @author      ThangNB - HE201024
 * @contributor Thái Khắc Hữu Đức - HE204463, Đồng Mạnh Hùng - HE200743, Tuấn - HE204215
 * @created     2026-05-31
 * @updated     2026-07-18
 *
 * Maps the {@code invoices} table — the billing record of one visit
 * (UC-23 Process Payment, UC-24 Deliver Invoice).
 *
 * Two status axes are tracked independently and must not be conflated:
 *   - {@code status}        DRAFT | ISSUED | CANCELLED — document lifecycle
 *   - {@code paymentStatus} UNPAID | PENDING_PAYMENT | PAID | PAYMENT_FAILED — settlement
 *
 * Business rules: BR-10 (PAID only on full payment), BR-11 (total formula),
 * BR-09 (cancellation is a soft state, rows are never deleted).
 */
@Entity
@Table(name = "invoices")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Invoice {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "appointment_id", nullable = false)
    private Appointment appointment;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "patient_id", nullable = false)
    private Patient patient;

    @Column(name = "invoice_code", unique = true, length = 30)
    private String invoiceCode;

    @Builder.Default
    @OneToMany(mappedBy = "invoice", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    private List<InvoiceItem> items = new ArrayList<>();

    // ── Charge breakdown, the three addends of BR-11 ──────────────────────
    /** Consultation fee component (BR-11: "Examination fee"). */
    @Column(name = "service_fee", precision = 12, scale = 2)
    private BigDecimal serviceFee;

    /** Diagnostics component (BR-11: "Lab fee"). */
    @Column(name = "lab_fee", precision = 12, scale = 2)
    private BigDecimal labFee;

    /** Pharmacy component (BR-11: "Medicine fee"). */
    @Column(name = "medicine_fee", precision = 12, scale = 2)
    private BigDecimal medicineFee;

    // ── Totals ────────────────────────────────────────────────────────────
    /** Sum of all charge lines before the discount. */
    @Column(name = "sub_total", nullable = false, precision = 12, scale = 2)
    private BigDecimal subTotal;

    /** Discount granted by the Receptionist.
     *  Validate: BR-15 — one discount per invoice, held as a single amount. */
    @Column(name = "discount_amount", nullable = false, precision = 12, scale = 2)
    private BigDecimal discountAmount;

    @Column(name = "tax", nullable = false, precision = 12, scale = 2)
    private BigDecimal tax;

    /** Amount payable. Validate: BR-11 — totalAmount = subTotal − discountAmount. */
    @Column(name = "total_amount", nullable = false, precision = 12, scale = 2)
    private BigDecimal totalAmount;

    // ── Payment ───────────────────────────────────────────────────────────
    /** CASH or VIET_QR (UC-23 ALT-1 / ALT-2). */
    @Column(name = "payment_method", length = 20)
    private String paymentMethod;

    @Column(name = "payment_reference", length = 100)
    private String paymentReference;

    /** UNPAID | PENDING_PAYMENT | PAID | PAYMENT_FAILED.
     *  PENDING_PAYMENT means the VietQR code has been shown and the system is
     *  waiting for the gateway webhook (UC-23 ALT-2 step 3).
     *  Validate: BR-10 — only a full payment may move this to PAID; a short
     *  transfer leaves the invoice unchanged (UC-23 E2). */
    @Column(name = "payment_status", nullable = false, length = 20)
    private String paymentStatus;

    @Column(name = "pdf_url")
    private String pdfUrl;

    // ── E-invoice email delivery (UC-24) ──────────────────────────────────
    /** NOT_SENT | SENDING | SENT | FAILED.
     *  Deliberately independent of paymentStatus: an invoice stays PAID even
     *  when the email fails, and the Receptionist can retry (UC-24 E1). */
    @Column(name = "email_status", length = 20)
    private String emailStatus;

    @Column(name = "email_sent_at")
    private LocalDateTime emailSentAt;

    // ── Document lifecycle & notes ────────────────────────────────────────
    /** DRAFT | ISSUED | CANCELLED.
     *  Validate: BR-09 — CANCELLED is a soft state; invoice rows are never
     *  physically deleted, so the audit trail stays intact. */
    @Column(name = "status", nullable = false, length = 20)
    private String status;

    @Column(name = "notes", columnDefinition = "NVARCHAR(MAX)")
    private String notes;

    @Column(name = "issued_by")
    private Long issuedBy;
    // --- THỜI GIAN ---
    @Column(name = "generated_at")
    private LocalDateTime generatedAt;

    @Column(name = "paid_at")
    private LocalDateTime paidAt;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    /**
     * Seeds the creation timestamp and every default before INSERT.
     *
     * Validate: BR-10 — a new invoice must always start UNPAID, never PAID,
     *           so payment can only be recorded through the payment flow.
     * Validate: BR-11 — every money column defaults to 0 rather than NULL,
     *           otherwise the total arithmetic would yield NULL.
     */
    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();

        // BR-10: an invoice is born as an unpaid draft, email not yet attempted
        if (status == null) status = "DRAFT";
        if (paymentStatus == null) paymentStatus = "UNPAID";
        if (emailStatus == null) emailStatus = "NOT_SENT";

        // BR-11: null money → 0 so subTotal − discount never evaluates to NULL
        if (subTotal == null) subTotal = BigDecimal.ZERO;
        if (discountAmount == null) discountAmount = BigDecimal.ZERO;
        if (tax == null) tax = BigDecimal.ZERO;

        // BR-11: the three fee components (exam + lab + medicine)
        if (serviceFee == null) serviceFee = BigDecimal.ZERO;
        if (labFee == null) labFee = BigDecimal.ZERO;
        if (medicineFee == null) medicineFee = BigDecimal.ZERO;

        if (totalAmount == null) totalAmount = BigDecimal.ZERO;
    }

    /** Refreshes the modification timestamp on every UPDATE. */
    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
