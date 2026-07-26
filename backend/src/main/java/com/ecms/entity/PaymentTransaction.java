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
     *  MATCHED         — invoice found and settled
     *  UNMATCHED       — no invoice code could be parsed from the memo
     *  AMOUNT_MISMATCH — invoice found but the amount did not cover the total (BR-10)
     *  DUPLICATE       — the invoice was already PAID
     *  IGNORED         — outgoing transfer, not a patient payment */
    @Column(name = "status", nullable = false, length = 20)
    private String status;

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
     * found the invoice and verified the amount (BR-10).
     */
    @PrePersist
    protected void onCreate() {
        if (receivedAt == null) receivedAt = LocalDateTime.now();
        if (status == null) status = "UNMATCHED";
    }
}
