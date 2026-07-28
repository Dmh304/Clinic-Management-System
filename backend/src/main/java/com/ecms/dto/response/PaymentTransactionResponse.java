package com.ecms.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * @author  ThangNB - HE201024
 * @created 2026-07-26
 * @updated 2026-07-26
 *
 * One row of the bank-transfer reconciliation screen.
 *
 * Surfaces the transactions that did not settle cleanly, plus every transaction
 * that owes money back to a patient, so nothing sits unresolved in the
 * {@code payment_transactions} table unseen. Related to UC-23 ALT-2.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PaymentTransactionResponse {

    private Long id;

    /** Gateway transaction id — the idempotency key, useful when calling the bank. */
    private String gatewayTxnId;

    private String gateway;

    /** Amount the bank actually reported. */
    private BigDecimal amount;

    /** Transfer memo as typed by the payer; where the invoice code is parsed from. */
    private String content;

    private String referenceCode;

    /** MATCHED | OVERPAID | UNMATCHED | AMOUNT_MISMATCH | DUPLICATE | IGNORED. */
    private String status;

    /** Why the transaction ended in that status — shown to whoever reconciles it. */
    private String note;

    private LocalDateTime transactionDate;
    private LocalDateTime receivedAt;

    // ── Invoice this transfer was matched against, when one was found ─────────
    private Long invoiceId;
    private String matchedInvoiceCode;
    /** Invoice total, so the reconciler can compare it against {@code amount}. */
    private BigDecimal invoiceTotal;
    private String patientName;
    private String patientPhone;

    /** Excess over the invoice total. Set only for OVERPAID — this is the figure
     *  to transfer back. */
    private BigDecimal overpaidAmount;

    // ── Refund tracking ──────────────────────────────────────────────────────
    /** NONE | REQUIRED | DONE. */
    private String refundStatus;
    private BigDecimal refundAmount;
    private LocalDateTime refundedAt;
    private String refundedByName;
    private String refundNote;
}
