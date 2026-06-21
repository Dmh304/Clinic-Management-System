/**
 * Author: Tuấn - HE204215
 * 
 * Đối tượng chuyển đổi dữ liệu (DTO) chứa thông tin yêu cầu lưu hồ sơ bệnh án điện tử
 * Lớp này tiếp nhận dữ liệu chẩn đoán chung và các chỉ số đo thị lực chuyên khoa
 */

package com.ecms.dto.request;

import lombok.Data;

import java.math.BigDecimal;

@Data
public class EMRRequest {

    /* Mã định danh của lịch hẹn khám tương ứng với bệnh án này */
    private Long appointmentId;

    /* Mã định danh của bác sĩ thực hiện khám và lập bệnh án */
    private Long doctorId;

    /* Lí do đến khám chính từ phía bệnh nhân */
    private String chiefComplaint;

    /* Các triệu chứng lâm sàng được ghi nhận trong quá trình khám */
    private String symptoms;

    /* Chẩn đoán của bác sĩ */
    private String diagnosis;

    /* Kế hoạch điều trị */
    private String treatmentPlan;

    /* Các ghi chú hoặc dặn dò bổ sung của bác sĩ */
    private String notes;

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

    /* Trạng thái của hồ sơ bệnh án */
    private String status;
}
