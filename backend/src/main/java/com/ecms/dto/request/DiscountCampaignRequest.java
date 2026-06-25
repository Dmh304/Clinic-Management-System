package com.ecms.dto.request;

import jakarta.validation.constraints.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDate;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class DiscountCampaignRequest {

    @NotBlank(message = "Tên chương trình không được trống")
    private String name;

    private String description;

    /** PERCENTAGE | FIXED_AMOUNT | VOUCHER */
    @NotBlank(message = "Vui lòng chọn loại giảm giá")
    private String type;

    @NotNull(message = "Vui lòng nhập giá trị giảm")
    @DecimalMin(value = "0.01", message = "Giá trị giảm phải lớn hơn 0")
    private BigDecimal value;

    /** Chỉ bắt buộc khi type = VOUCHER */
    private String voucherCode;

    @NotNull(message = "Vui lòng chọn ngày bắt đầu")
    private LocalDate validFrom;

    @NotNull(message = "Vui lòng chọn ngày kết thúc")
    private LocalDate validTo;

    private BigDecimal minPurchaseAmount;

    private Integer maxUsageCount;

    private Boolean isActive;
}
