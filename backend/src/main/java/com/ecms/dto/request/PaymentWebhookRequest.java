package com.ecms.dto.request;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.Data;

import java.math.BigDecimal;

/**
 * @author  ThangNB - HE201024
 * @created 2026-07-11
 * @updated 2026-07-17
 *
 * Incoming-payment webhook payload from the gateway (SePay format —
 * https://docs.sepay.vn/tich-hop-webhooks.html). The gateway POSTs this to
 * ECMS whenever the clinic's bank account balance changes
 * (UC-23 ALT-2 step 5).
 *
 * Sample payload:
 * <pre>
 * {
 *   "id": 92704,
 *   "gateway": "Vietcombank",
 *   "transactionDate": "2025-07-17 14:02:37",
 *   "accountNumber": "0123499999",
 *   "content": "Thanh toan INV-20250717-0001",
 *   "transferType": "in",
 *   "transferAmount": 350000,
 *   "referenceCode": "MBVCB.3278907687",
 *   "description": ""
 * }
 * </pre>
 */
@Data
@JsonIgnoreProperties(ignoreUnknown = true) // gateways add fields over time; never break the webhook
public class PaymentWebhookRequest {

    /** Gateway-assigned transaction id.
     *  Validate: used as the idempotency key — a repeat of the same id is
     *  rejected as DUPLICATE so a retry cannot settle an invoice twice. */
    private String id;

    /** Bank or gateway that reported the movement. */
    private String gateway;

    /** Transaction timestamp, "yyyy-MM-dd HH:mm:ss". */
    private String transactionDate;

    /** Receiving account number. */
    private String accountNumber;

    /** Transfer memo — this is where the INV-yyyyMMdd-XXXX invoice code is
     *  recovered from, which is what links the money to an invoice. */
    private String content;

    /** "in" = money received (billable), "out" = outgoing (IGNORED). */
    private String transferType;

    /** Amount transferred.
     *  Validate: BR-10 — must cover the invoice total, otherwise the
     *  transaction is journalled as AMOUNT_MISMATCH and the invoice stays
     *  PENDING_PAYMENT (UC-23 E2 partial payment). */
    private BigDecimal transferAmount;

    /** Bank reference code, e.g. MBVCB.3278907687. */
    private String referenceCode;

    /** Extra description; some gateways put the memo here instead of content. */
    private String description;

    /** Code the gateway already extracted using its configured prefix rule —
     *  preferred over parsing {@code content} ourselves when present. */
    private String code;
}
