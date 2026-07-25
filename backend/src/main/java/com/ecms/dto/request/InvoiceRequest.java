package com.ecms.dto.request;

import lombok.Data;

import java.math.BigDecimal;
import java.util.List;

@Data
public class InvoiceRequest {

    // Đúng một trong hai: appointmentId (khám bác sĩ) hoặc subscriptionId (gói/buổi dịch vụ
    // chăm sóc — UC-21, thu tại lần check-out đầu tiên của gói).
    private Long appointmentId;

    private Long subscriptionId;

    private List<InvoiceItemRequest> items;

    // Số tiền giảm giá do lễ tân áp dụng (BR-11: Total = phí − Discount). Có thể null = 0.
    // Bỏ qua nếu discountCode được cung cấp — khi đó server tự tính từ chương trình giảm giá.
    private BigDecimal discountAmount;

    // UC-43: mã chương trình giảm giá (voucher) muốn áp dụng cho hoá đơn này — tuỳ chọn.
    private String discountCode;

    // CASH hoặc VIET_QR
    private String paymentMethod;

    private String paymentReference;

    private String notes;

    @Data
    public static class InvoiceItemRequest {

        // SERVICE | MEDICINE | GLASSES | OTHER
        private String itemType;

        private Long refId;

        private String description;

        private Integer quantity;

        private BigDecimal unitPrice;
    }
}
