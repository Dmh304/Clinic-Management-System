package com.ecms.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * @author  ThangNB - HE201024
 * @created 2026-07-17
 * @updated 2026-07-17
 *
 * Settlement state of one invoice, polled by the frontend roughly every three
 * seconds while the VietQR code is displayed (UC-23 ALT-2 step 4), so the
 * screen advances on its own once the bank confirms the transfer.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PaymentStatusResponse {

    private Long invoiceId;

    private String invoiceCode;

    /** Document lifecycle: DRAFT | ISSUED | CANCELLED. */
    private String status;

    /** Settlement: UNPAID | PENDING_PAYMENT | PAID | PAYMENT_FAILED. */
    private String paymentStatus;

    /** Convenience flag, true when paymentStatus is PAID — the single value the
     *  polling loop reads to decide it can stop. Set per BR-10, so it can only
     *  be true once the transferred amount covered the total. */
    private boolean paid;

    private BigDecimal totalAmount;

    /** Amount the gateway actually reported; null while no transfer has arrived. */
    private BigDecimal paidAmount;

    /** Bank transaction reference of the transfer matched to this invoice. */
    private String paymentReference;

    private LocalDateTime paidAt;
}
