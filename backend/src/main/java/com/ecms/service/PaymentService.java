package com.ecms.service;

import com.ecms.dto.request.PaymentWebhookRequest;
import com.ecms.dto.response.PaymentStatusResponse;

/**
 * @author  ThangNB - HE201024
 * @created 2026-07-11
 * @updated 2026-07-17
 *
 * Automated settlement contract for the VietQR branch of UC-23 (Process
 * Payment, ALT-2 QR Code / Bank Transfer).
 *
 * Why this exists: the cash path relies on a Receptionist asserting that money
 * changed hands. For a bank transfer that assertion is not good enough — an
 * invoice would reach PAID even if the patient never transferred. These
 * methods let the gateway itself report the incoming funds, and ECMS settles
 * the invoice from that report.
 *
 * Business rules: BR-10 — an invoice becomes PAID only when the reported
 * amount covers the total; anything short leaves it untouched (UC-23 E2).
 */
public interface PaymentService {

    /**
     * Processes one incoming-payment webhook from the gateway
     * (UC-23 ALT-2 step 5).
     *
     * Every call is journalled to {@code payment_transactions}, including
     * transfers that match no invoice, so accounting can reconcile them later.
     *
     * @param request    parsed webhook payload
     * @param rawPayload the untouched JSON body, stored for audit
     * @return reconciliation outcome — MATCHED | UNMATCHED | AMOUNT_MISMATCH
     *         | DUPLICATE | IGNORED
     *
     * Validate: BR-10 — only a MATCHED transfer whose amount covers the
     * invoice total may settle it; AMOUNT_MISMATCH deliberately leaves the
     * invoice PENDING_PAYMENT.
     */
    String handleWebhook(PaymentWebhookRequest request, String rawPayload);

    /**
     * Reports whether an invoice has been settled yet — polled by the frontend
     * every few seconds while the QR code is on screen (UC-23 ALT-2 step 4),
     * so no manual confirmation is needed.
     *
     * @param invoiceId invoice being paid
     * @return current payment state of that invoice
     */
    PaymentStatusResponse getPaymentStatus(Long invoiceId);

    /**
     * Authenticates a webhook call by comparing the Authorization header
     * against the configured gateway API key.
     *
     * @param authorizationHeader raw Authorization header, may be null
     * @return true when the key matches
     *
     * Validate: the webhook endpoint is public by necessity (the gateway has
     * no session), so this shared-secret check is the only thing preventing an
     * attacker from marking arbitrary invoices as paid.
     */
    boolean isValidApiKey(String authorizationHeader);
}
