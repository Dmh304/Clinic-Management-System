// ThangNBHE201024 - HE187030
// DTO nhận payload webhook từ cổng thanh toán (chuẩn SePay — https://docs.sepay.vn/tich-hop-webhooks.html).
// Cổng gọi POST về ECMS mỗi khi tài khoản ngân hàng của phòng khám có biến động số dư.
//
// Ví dụ payload thật:
// {
//   "id": 92704,
//   "gateway": "Vietcombank",
//   "transactionDate": "2025-07-17 14:02:37",
//   "accountNumber": "0123499999",
//   "content": "Thanh toan INV-20250717-0001",
//   "transferType": "in",
//   "transferAmount": 350000,
//   "referenceCode": "MBVCB.3278907687",
//   "description": ""
// }
package com.ecms.dto.request;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.Data;

import java.math.BigDecimal;

@Data
@JsonIgnoreProperties(ignoreUnknown = true) // cổng có thể thêm field mới; không để vỡ webhook
public class PaymentWebhookRequest {

    // Mã giao dịch do cổng cấp — dùng làm khóa chống xử lý trùng
    private String id;

    // Tên ngân hàng/cổng gửi biến động số dư
    private String gateway;

    // Thời điểm giao dịch, định dạng "yyyy-MM-dd HH:mm:ss"
    private String transactionDate;

    // Số tài khoản nhận tiền
    private String accountNumber;

    // Nội dung chuyển khoản — nơi chứa mã hóa đơn INV-yyyyMMdd-XXXX
    private String content;

    // "in" = tiền vào (thanh toán), "out" = tiền ra (bỏ qua)
    private String transferType;

    // Số tiền giao dịch
    private BigDecimal transferAmount;

    // Mã tham chiếu ngân hàng
    private String referenceCode;

    // Mô tả bổ sung; một số cổng nhét nội dung chuyển khoản vào đây thay vì content
    private String description;

    // Mã do cổng tự bóc tách theo cấu hình prefix (nếu có) — ưu tiên dùng nếu cổng đã bóc sẵn
    private String code;
}
