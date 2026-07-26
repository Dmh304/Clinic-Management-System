package com.ecms.controller;

import com.ecms.dto.request.PaymentWebhookRequest;
import com.ecms.dto.request.RefundConfirmRequest;
import com.ecms.dto.response.ApiResponse;
import com.ecms.dto.response.PaymentStatusResponse;
import com.ecms.dto.response.PaymentTransactionResponse;
import com.ecms.entity.User;
import com.ecms.exception.ResourceNotFoundException;
import com.ecms.repository.UserRepository;
import com.ecms.service.PaymentService;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * @author  ThangNB - HE201024
 * @created 2026-07-11
 * @updated 2026-07-17
 *
 * REST entry point for automated VietQR settlement
 * (UC-23 Process Payment, ALT-2 QR Code / Bank Transfer).
 * Base URL: /api/v1/payments
 *
 *   POST /webhook                   gateway callback on incoming funds — PUBLIC + API key
 *   GET  /invoice/{id}/status       polled by the frontend while the QR is shown — authenticated
 *
 * Why the webhook is public: the gateway calls from its own servers and holds
 * no ECMS session. It is protected instead by a shared API key
 * ({@code Authorization: Apikey <key>}) plus the requirement that the
 * transaction id has never been processed before.
 *
 * There is deliberately no "simulate payment" endpoint. To exercise the flow
 * locally, call /webhook with curl and the API key (see
 * docs/payment-webhook-demo.md) — that runs the same code path the gateway
 * will, so no authentication-bypassing back door is needed.
 *
 * Business rules: BR-10 (PAID only on full payment).
 */
@Slf4j
@RestController
@RequestMapping("/api/v1/payments")
@RequiredArgsConstructor
public class PaymentController {

    private final PaymentService paymentService;
    private final ObjectMapper objectMapper;
    private final UserRepository userRepository;

    /**
     * Receives an incoming-payment notification from the gateway
     * (UC-23 ALT-2 step 5).
     *
     * The gateway treats HTTP 200 as "delivered" and retries on anything else.
     * So only an invalid API key returns 401; business outcomes (no matching
     * invoice, short amount) still return 200 with the outcome in the body, to
     * stop the gateway retrying something that will never succeed. Those
     * transactions are already journalled for manual reconciliation.
     *
     * @param authorization shared-secret header, "Apikey &lt;key&gt;"
     * @param request       the gateway payload
     * @return 200 with {@code status} = MATCHED | UNMATCHED | AMOUNT_MISMATCH
     *         | DUPLICATE | IGNORED, or 401 on a bad key
     *
     * Validate: the API key check is the only authentication on this public
     * endpoint — without it anyone could POST a fake transfer and mark
     * invoices PAID. BR-10 is then enforced inside the service.
     */
    @PostMapping("/webhook")
    public ResponseEntity<Map<String, Object>> handleWebhook(
            @RequestHeader(value = "Authorization", required = false) String authorization,
            @RequestBody PaymentWebhookRequest request) {

        // Gate before any processing: an unauthenticated caller must not be
        // able to influence invoice state or even write to the journal.
        if (!paymentService.isValidApiKey(authorization)) {
            log.warn("Webhook bị từ chối do sai API key. gatewayTxnId={}", request.getId());
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("success", false, "message", "API key không hợp lệ"));
        }

        String rawPayload;
        try {
            rawPayload = objectMapper.writeValueAsString(request);
        } catch (Exception e) {
            rawPayload = String.valueOf(request);
        }

        try {
            String result = paymentService.handleWebhook(request, rawPayload);
            // success=true only tells the gateway "received and journalled".
            // The business outcome lives in the status field.
            return ResponseEntity.ok(Map.of("success", true, "status", result));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest()
                    .body(Map.of("success", false, "message", e.getMessage()));
        }
    }

    /**
     * Current settlement state of an invoice — polled by the frontend every
     * three seconds while the QR code is displayed, so the screen flips to
     * "paid" as soon as the gateway reports the funds (UC-23 ALT-2 step 4).
     *
     * @param invoiceId invoice being paid
     * @return the invoice's payment state, including the {@code paid} flag
     *         that ends the polling loop
     */
    @GetMapping("/invoice/{invoiceId}/status")
    public ResponseEntity<ApiResponse<PaymentStatusResponse>> getPaymentStatus(
            @PathVariable Long invoiceId) {
        return ResponseEntity.ok(ApiResponse.success(paymentService.getPaymentStatus(invoiceId)));
    }

    /**
     * Worklist of bank transfers a human still has to resolve: ones that did not
     * settle cleanly, plus ones that owe money back to a patient.
     *
     * This is how a wrong transfer becomes visible at all — an overpayment, a
     * duplicate payment, or a payment against a cancelled invoice.
     *
     * @return the transactions needing attention, newest first
     */
    @GetMapping("/reconciliation")
    public ResponseEntity<ApiResponse<List<PaymentTransactionResponse>>> getReconciliationList() {
        return ResponseEntity.ok(ApiResponse.success(paymentService.getReconciliationList()));
    }

    /**
     * Records that staff have returned money to a patient for a wrong transfer.
     *
     * ECMS does not move money; the refund itself is a bank transfer or cash
     * hand-back done outside the system. This writes the audit trail.
     *
     * @param userDetails   authenticated principal, resolved to the confirming staff
     * @param transactionId the journalled transfer being refunded
     * @param request       amount returned plus a mandatory note
     * @return the updated transaction
     * @throws ResourceNotFoundException if the principal has no user record
     *
     * Validate: the confirming staff id comes from the JWT, never the request, so
     * a refund cannot be attributed to someone else. The service enforces that
     * the amount does not exceed what the bank reported, and that one transfer
     * is not refunded twice.
     */
    @PatchMapping("/transactions/{transactionId}/refund")
    public ResponseEntity<ApiResponse<PaymentTransactionResponse>> confirmRefund(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable Long transactionId,
            @Valid @RequestBody RefundConfirmRequest request) {
        User actor = userRepository.findByEmail(userDetails.getUsername())
                .orElseThrow(() -> new ResourceNotFoundException("Người dùng không tồn tại"));
        return ResponseEntity.ok(ApiResponse.success(
                paymentService.confirmRefund(transactionId, request, actor.getId())));
    }

}
