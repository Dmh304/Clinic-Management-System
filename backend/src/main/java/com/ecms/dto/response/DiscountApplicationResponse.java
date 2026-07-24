package com.ecms.dto.response;

import lombok.*;

import java.math.BigDecimal;

/** Kết quả tính/áp dụng một mã giảm giá lên một số tiền đơn hàng — dùng chung cho mọi
 *  luồng checkout (mua gói dịch vụ, hoá đơn khám...). */
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class DiscountApplicationResponse {
    private Long campaignId;
    private String campaignName;
    private BigDecimal discountAmount;
    private BigDecimal finalAmount;
}
