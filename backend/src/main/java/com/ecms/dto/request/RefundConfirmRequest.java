package com.ecms.dto.request;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.math.BigDecimal;

/**
 * @author  ThangNB - HE201024
 * @created 2026-07-26
 * @updated 2026-07-26
 *
 * Staff confirmation that money has been returned to a patient after a wrong
 * transfer (overpayment, duplicate payment, or payment against a cancelled
 * invoice).
 *
 * This records a refund that already happened outside ECMS — the system does
 * not move money, exactly as UC-54 states for payroll. The note is what makes
 * the refund defensible later, so it is mandatory.
 */
@Data
public class RefundConfirmRequest {

    /** Amount actually returned.
     *  Validate: required and greater than 0; the service additionally rejects an
     *  amount larger than what the bank originally reported, since the clinic
     *  cannot return money it never received. */
    @NotNull(message = "Vui lòng nhập số tiền đã hoàn")
    @DecimalMin(value = "0.01", message = "Số tiền hoàn phải lớn hơn 0")
    private BigDecimal refundAmount;

    /** How the money went back — transfer reference, "trả tiền mặt tại quầy", …
     *  Validate: mandatory, so every refund carries an audit trail (BR-09 keeps
     *  the record forever; a blank reason would make it useless). */
    @NotBlank(message = "Vui lòng ghi rõ cách hoàn tiền")
    private String note;
}
