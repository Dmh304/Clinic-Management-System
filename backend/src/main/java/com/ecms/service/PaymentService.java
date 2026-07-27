package com.ecms.service;

import com.ecms.dto.request.PaymentWebhookRequest;
import com.ecms.dto.request.RefundConfirmRequest;
import com.ecms.dto.response.PaymentStatusResponse;
import com.ecms.dto.response.PaymentTransactionResponse;

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
     * @return reconciliation outcome — MATCHED | PARTIAL | OVERPAID | UNMATCHED
     *         | DUPLICATE | IGNORED
     *
     * Validate: BR-10 — hóa đơn chỉ tất toán khi TỔNG tiền đã nhận qua các lần
     * chuyển phủ được tổng hóa đơn (UC-23 E2 thanh toán từng phần). Chưa đủ thì
     * ghi PARTIAL và hóa đơn ở PARTIALLY_PAID — phần còn thiếu vẫn là công nợ,
     * và phân biệt được với hóa đơn chưa nhận đồng nào.
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
     * Lists the bank transfers a human still has to resolve — ones that did not
     * settle cleanly, plus ones that owe money back to a patient.
     *
     * This is the entry point for handling a wrong transfer: an overpayment, a
     * duplicate payment, or a payment against a cancelled invoice. Without it
     * those rows sit in {@code payment_transactions} unseen.
     *
     * @return the worklist, newest transfer first
     */
    java.util.List<PaymentTransactionResponse> getReconciliationList();

    /**
     * Records that staff have returned money to a patient.
     *
     * ECMS does not move money — the transfer or cash hand-back happens outside
     * the system, exactly as UC-54 states for payroll. This only writes the
     * audit trail: amount, who confirmed it, when, and how.
     *
     * @param transactionId the journalled transfer being refunded
     * @param request       amount actually returned plus a mandatory note
     * @param actorUserId   staff member confirming, recorded for accountability
     * @return the updated transaction
     *
     * Validate: the refund amount may not exceed what the bank reported for that
     * transfer — the clinic cannot return money it never received. Confirming a
     * refund twice is rejected, so one transfer cannot be paid back twice.
     */
    PaymentTransactionResponse confirmRefund(Long transactionId,
                                            RefundConfirmRequest request,
                                            Long actorUserId);

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
