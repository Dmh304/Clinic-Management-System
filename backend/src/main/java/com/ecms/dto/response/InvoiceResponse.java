package com.ecms.dto.response;

import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class InvoiceResponse {

    private Long id;
    private String invoiceCode;

    private Long appointmentId;
    private String patientName;
    private String patientPhone;
    private String patientEmail;
    private String patientCode;
    private String doctorName;
    private String serviceName;
    private LocalDateTime appointmentTime;
    private String timeSlot;

    private List<InvoiceItemResponse> items;

    private BigDecimal serviceFee;
    private BigDecimal labFee;
    private BigDecimal medicineFee;
    private BigDecimal totalAmount;

    private String paymentMethod;
    private String paymentReference;
    private String status;
    private String paymentStatus;

    private Long issuedBy;
    private String notes;
    private LocalDateTime paidAt;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class InvoiceItemResponse {
        private Long id;
        private String itemType;
        private Long refId;
        private String description;
        private Integer quantity;
        private BigDecimal unitPrice;
        private BigDecimal subtotal;
    }
}
