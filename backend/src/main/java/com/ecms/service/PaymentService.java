// ThangNBHE201024 - HE187030
// Interface nghiệp vụ thanh toán tự động (UC-22 Process Payment — luồng VietQR).
//
// Bối cảnh: trước đây lễ tân bấm "Xác nhận thu tiền" và hệ thống tin tưởng tuyệt đối,
// tức hóa đơn được đánh dấu PAID kể cả khi bệnh nhân chưa thực sự chuyển khoản.
// Các method dưới đây cho phép chính ngân hàng/cổng thanh toán báo ngược về hệ thống
// khi tiền đã vào tài khoản, rồi ECMS tự gạch nợ hóa đơn.
package com.ecms.service;

import com.ecms.dto.request.PaymentWebhookRequest;
import com.ecms.dto.response.PaymentStatusResponse;

public interface PaymentService {

    // Xử lý một webhook biến động số dư từ cổng thanh toán.
    // Trả về trạng thái đối soát: MATCHED | UNMATCHED | AMOUNT_MISMATCH | DUPLICATE | IGNORED.
    // Luôn ghi nhật ký giao dịch, kể cả khi không khớp hóa đơn nào.
    String handleWebhook(PaymentWebhookRequest request, String rawPayload);

    // Kiểm tra hóa đơn đã được thanh toán chưa — frontend polling khi đang hiện mã QR.
    PaymentStatusResponse getPaymentStatus(Long invoiceId);

    // So khớp API key trong header Authorization của webhook với key cấu hình.
    boolean isValidApiKey(String authorizationHeader);
}
