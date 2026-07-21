// ThangNBHE201024 - HE187030
//
// REST Controller cho thanh toán tự động qua VietQR (UC-22 Process Payment).
// Base URL: /api/v1/payments
//
// Danh sách endpoint:
//   POST /webhook          — Cổng thanh toán (SePay) gọi khi tài khoản có tiền vào. PUBLIC + API key.
//   GET  /invoice/{id}/status — Frontend polling xem hóa đơn đã được thanh toán chưa. Cần đăng nhập.
//
// Vì sao webhook là public: cổng thanh toán gọi từ server của họ, không có JWT của ECMS.
// Bù lại, endpoint được bảo vệ bằng API key dùng chung (header Authorization: Apikey <key>)
// và chỉ chấp nhận payload có mã giao dịch chưa từng xử lý.
//
// Không có endpoint "giả lập" nào ở đây: muốn thử luồng thanh toán khi chạy local thì gọi
// thẳng /webhook bằng curl kèm API key (xem docs/payment-webhook-demo.md). Cách đó đi qua
// đúng code path mà SePay sẽ đi, nên không cần một cửa sau bỏ qua xác thực.
package com.ecms.controller;

import com.ecms.dto.request.PaymentWebhookRequest;
import com.ecms.dto.response.ApiResponse;
import com.ecms.dto.response.PaymentStatusResponse;
import com.ecms.service.PaymentService;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@Slf4j
@RestController
@RequestMapping("/api/v1/payments")
@RequiredArgsConstructor
public class PaymentController {

    private final PaymentService paymentService;
    private final ObjectMapper objectMapper;

    /**
     * Webhook nhận biến động số dư từ cổng thanh toán.
     *
     * Cổng yêu cầu ECMS trả HTTP 200 để coi là đã nhận thành công; trả mã khác thì cổng
     * sẽ retry. Do đó ở đây chỉ trả 401 khi sai API key, còn các trường hợp nghiệp vụ
     * (không khớp hóa đơn, sai số tiền) vẫn trả 200 kèm status để cổng không retry vô ích —
     * giao dịch đã được ghi vào nhật ký để kế toán đối soát tay.
     */
    @PostMapping("/webhook")
    public ResponseEntity<Map<String, Object>> handleWebhook(
            @RequestHeader(value = "Authorization", required = false) String authorization,
            @RequestBody PaymentWebhookRequest request) {

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
            // success=true báo cho cổng biết ECMS đã nhận và ghi nhật ký xong.
            // Ý nghĩa nghiệp vụ nằm ở field status.
            return ResponseEntity.ok(Map.of("success", true, "status", result));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest()
                    .body(Map.of("success", false, "message", e.getMessage()));
        }
    }

    /**
     * Trạng thái thanh toán của hóa đơn — frontend gọi mỗi 3 giây khi đang hiện mã QR,
     * để tự chuyển sang "Đã thanh toán" ngay khi cổng báo tiền về.
     */
    @GetMapping("/invoice/{invoiceId}/status")
    public ResponseEntity<ApiResponse<PaymentStatusResponse>> getPaymentStatus(
            @PathVariable Long invoiceId) {
        return ResponseEntity.ok(ApiResponse.success(paymentService.getPaymentStatus(invoiceId)));
    }

}
