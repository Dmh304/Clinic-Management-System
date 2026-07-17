package com.ecms.dto.request;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.math.BigDecimal;
import java.util.List;

@Data
public class InvoiceRequest {

    @NotNull(message = "Lịch hẹn không được để trống")
    private Long appointmentId;

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
