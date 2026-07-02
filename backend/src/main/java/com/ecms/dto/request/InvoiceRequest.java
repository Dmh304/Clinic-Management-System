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
