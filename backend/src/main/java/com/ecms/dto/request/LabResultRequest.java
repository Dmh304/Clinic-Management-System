package com.ecms.dto.request;

import java.math.BigDecimal;

import lombok.Data;

@Data
public class LabResultRequest {
    /* Mã định danh của lịch hẹn khám tương ứng với bệnh án này */
    private Long labOrderId;

    /* Thị lực mắt trái khi chưa điều chỉnh kính */
    private BigDecimal vaL;

    /* Thị lực mắt phải khi chưa điều chỉnh kính */
    private BigDecimal vaR;

    /* Thị lực tối đa của mắt trái sau khi điều chỉnh kính tối ưu */
    private BigDecimal bcvaL;

    /* Thị lực tối đa của mắt phải sau khi điều chỉnh kính tối ưu */
    private BigDecimal bcvaR;

    /* Độ cầu mắt trái (dấu + cho viễn thị, dấu - cho cận thị) */
    private BigDecimal sphL;

    /* Độ loạn mắt trái */
    private BigDecimal cylL;

    /* Trục loạn thị mắt trái (đơn vị: độ, từ 0 đến 180) */
    private Integer axisL;

    /* Nhãn áp mắt trái (đơn vị: mmHg) */
    private BigDecimal iopL;

    /* Độ cầu mắt phải (dấu + cho viễn thị, dấu - cho cận thị) */
    private BigDecimal sphR;

    /* Độ loạn mắt phải */
    private BigDecimal cylR;

    /* Trục loạn thị mắt phải (đơn vị: độ, từ 0 đến 180) */
    private Integer axisR;

    /* Nhãn áp mắt phải (đơn vị: mmHg) */
    private BigDecimal iopR;

    private String imageUrl;

    private String doctorNotes;
}
