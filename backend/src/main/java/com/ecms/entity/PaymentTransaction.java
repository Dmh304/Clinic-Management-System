package com.ecms.entity;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * @author  ThangNB - HE201024
 * @created 2026-07-11
 * @updated 2026-07-17
 *
 * Maps the {@code payment_transactions} table — every bank transfer the
 * payment gateway (SePay / Casso) reports through the webhook
 * (UC-23 ALT-2 Process Payment via QR / bank transfer).
 *
 * Three jobs:
 *  - Reconciliation journal: the gateway's raw payload is kept verbatim so a
 *    disputed payment can be traced back to what the bank actually sent.
 *  - Idempotency: {@code gateway_txn_id} is UNIQUE, so a retried webhook is
 *    written once and can never settle the same invoice twice.
 *  - Traceability: a transfer that matches no invoice is still stored with
 *    status UNMATCHED instead of being dropped, leaving accounting a worklist.
 *
 * Business rules: BR-10 — only a transfer whose amount covers the invoice
 * total is allowed to mark that invoice PAID.
 */
@Entity
@Table(name = "payment_transactions")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PaymentTransaction {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** Gateway-assigned transaction id.
     *  Validate: UNIQUE constraint is the idempotency guard — a gateway retry
     *  of the same transaction cannot be journalled, or settled, twice. */
    @Column(name = "gateway_txn_id", nullable = false, unique = true, length = 100)
    private String gatewayTxnId;

    /** Gateway or bank that sent the webhook, e.g. SePay, Vietcombank. */
    @Column(name = "gateway", length = 50)
    private String gateway;

    /** Invoice this transfer settled; null when no invoice could be matched. */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "invoice_id")
    private Invoice invoice;

    /** Invoice code recovered from the transfer memo (INV-yyyyMMdd-XXXX). */
    @Column(name = "matched_invoice_code", length = 30)
    private String matchedInvoiceCode;

    /** Amount received. Compared against the invoice total under BR-10. */
    @Column(name = "amount", precision = 12, scale = 2)
    private BigDecimal amount;

    /** Transfer memo as typed by the payer — the text the invoice code is parsed from. */
    @Column(name = "content", length = 500)
    private String content;

    /** Receiving account number. */
    @Column(name = "account_number", length = 50)
    private String accountNumber;

    /** Bank reference code, e.g. MBVCB.3278907687. */
    @Column(name = "reference_code", length = 100)
    private String referenceCode;

    /** "in" = money received, "out" = money sent.
     *  Validate: only "in" transfers are reconciled; an "out" movement is
     *  journalled as IGNORED so clinic payouts never settle a patient invoice. */
    @Column(name = "transfer_type", length = 10)
    private String transferType;

    /** Reconciliation outcome:
     *  MATCHED         — invoice found, amount exactly covered the total, settled
     *  OVERPAID        — invoice found and settled, but the patient sent MORE than
     *                    the total; the excess is owed back (see overpaidAmount)
     *  UNMATCHED       — no invoice code in the memo, no such invoice, or the
     *                    invoice was already cancelled
     *  AMOUNT_MISMATCH — invoice found but the amount was short (BR-10)
     *  DUPLICATE       — the invoice was already PAID, so this transfer is a
     *                    second payment and is owed back in full
     *  IGNORED         — outgoing transfer, not a patient payment */
    @Column(name = "status", nullable = false, length = 20)
    private String status;

    /** How much the patient sent above the invoice total. Only set for OVERPAID.
     *  Kept as its own column rather than recomputed later, because the invoice
     *  total may legitimately change if the invoice is cancelled and re-raised. */
    @Column(name = "overpaid_amount", precision = 12, scale = 2)
    private BigDecimal overpaidAmount;

    // ── Refund tracking ───────────────────────────────────────────────────────
    // ECMS never moves money itself (same principle as payroll in UC-54): staff
    // transfer or hand back the cash outside the system. These columns exist so
    // the obligation is recorded and its settlement is auditable, rather than
    // living in someone's notebook.

    /** NONE | REQUIRED | DONE.
     *  REQUIRED is set automatically for the cases where money is provably owed
     *  back (OVERPAID, DUPLICATE, payment against a cancelled invoice). It is
     *  informational — it drives the "needs refund" badge and count; the actual
     *  refund is recorded by staff. */
    @Column(name = "refund_status", nullable = false, length = 20)
    private String refundStatus;

    /** Amount actually returned to the patient, filled when staff confirm. */
    @Column(name = "refund_amount", precision = 12, scale = 2)
    private BigDecimal refundAmount;

    /** When staff confirmed the refund had been made. */
    @Column(name = "refunded_at")
    private LocalDateTime refundedAt;

    /** User id of the staff member who confirmed the refund (audit trail). */
    @Column(name = "refunded_by")
    private Long refundedBy;

    /** How the money went back — bank transfer reference, "trả tiền mặt tại quầy",
     *  or why no refund was needed after investigation. */
    @Column(name = "refund_note", length = 500)
    private String refundNote;

    /** Reason text for any status other than MATCHED, shown to accounting
     *  during manual reconciliation. */
    @Column(name = "note", length = 500)
    private String note;

    /** Verbatim gateway JSON — kept for dispute resolution and debugging. */
    @Column(name = "raw_payload", columnDefinition = "NVARCHAR(MAX)")
    private String rawPayload;

    /** Transaction time as reported by the gateway. */
    @Column(name = "transaction_date")
    private LocalDateTime transactionDate;

    /** Time ECMS received the webhook. */
    @Column(name = "received_at", nullable = false)
    private LocalDateTime receivedAt;

    /**
     * Fills defaults before INSERT.
     *
     * Validate: status defaults to UNMATCHED, never MATCHED — a transaction is
     * only promoted to MATCHED after the reconciliation logic has actually
     * found the invoice and verified the amount (BR-10). refundStatus defaults
     * to NONE so a transaction is never born claiming a refund was already made.
     */
    @PrePersist
    protected void onCreate() {
        if (receivedAt == null) receivedAt = LocalDateTime.now();
        if (status == null) status = "UNMATCHED";
        if (refundStatus == null) refundStatus = "NONE";
    }
}
