// ThangNBHE201024
// DTO trả về thông tin hóa đơn cho client.
// Gồm 2 lớp lồng nhau:
//   - InvoiceResponse: thông tin tổng quan hóa đơn (bệnh nhân, bác sĩ, tổng tiền, trạng thái)
//   - InvoiceItemResponse: từng dòng chi tiết khoản phí bên trong hóa đơn
// patientEmail được thêm để hỗ trợ tính năng gửi email hóa đơn điện tử (UC-17).
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
    // Mã hóa đơn dạng INV-yyyyMMdd-XXXX
    private String invoiceCode;

    // Thông tin lịch hẹn liên quan
    private Long appointmentId;
    // Thông tin bệnh nhân — dùng để hiển thị và gửi email
    private String patientName;
    private String patientPhone;
    private String patientEmail;
    private String patientCode;
    private String doctorName;
    private String serviceName;
    private LocalDateTime appointmentTime;
    private String timeSlot;

    // Danh sách chi tiết khoản phí; rỗng khi gọi getAllInvoices(), đầy đủ khi gọi getById()
    private List<InvoiceItemResponse> items;

    // Phân nhóm phí theo loại (phục vụ thống kê và hiển thị trên hóa đơn)
    private BigDecimal serviceFee;
    private BigDecimal labFee;
    private BigDecimal medicineFee;
    private BigDecimal totalAmount;

    // Thông tin thanh toán
    private String paymentMethod;   // CASH | VIET_QR
    private String paymentReference;
    private String status;          // DRAFT | ISSUED | CANCELLED
    private String paymentStatus;   // UNPAID | PAID | PAYMENT_FAILED

    private Long issuedBy;
    private String notes;
    private LocalDateTime paidAt;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    // Chi tiết từng khoản phí trong hóa đơn
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class InvoiceItemResponse {
        private Long id;
        private String itemType;   // SERVICE | MEDICINE | GLASSES | LAB | OTHER
        private Long refId;
        private String description;
        private Integer quantity;
        private BigDecimal unitPrice;
        private BigDecimal subtotal;
    }
}
