/**
 * Author: Tuấn - HE204215
 * 
 * Đối tượng chuyển đổi dữ liệu (DTO) phàn hồi thông tin hồ sơ bệnh án điện tử
 */

package com.ecms.dto.response;

import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class EMRResponse {

    /** Mã định danh bản ghi của hồ sơ bệnh án điện tử này trong cơ sở dữ liệu */
    private Long id;

    /** Mã định danh của lịch hẹn khám gắn liền với bệnh án này */
    private Long appointmentId;

    /** Ngày và thời gian diễn ra lịch hẹn khám */
    private LocalDateTime appointmentTime;

    /** Khung giờ khám cụ thể của lịch hẹn */
    private String timeSlot;

    /** Mã định danh của bệnh nhân sở hữu hồ sơ bệnh án này */
    private Long patientId;

    /** Họ và tên bệnh nhân */
    private String patientName;

    /** Số điện thoại liên hệ của bệnh nhân */
    private String patientPhone;

    /** Ngày sinh của bệnh nhân */
    private LocalDate patientDob;

    /** Giới tính của bệnh nhân */
    private String patientGender;

    /** Địa chỉ thường trú của bệnh nhân */
    private String patientAddress;

    /** Mã định danh của bác sĩ chịu trách nhiệm khám và lập bệnh án */
    private Long doctorId;

    /** Họ và tên của bác sĩ khám */
    private String doctorName;

    /** Lí do đến khám chính từ phía bệnh nhân */
    private String chiefComplaint;

    /** Các triệu chứng lâm sàng được ghi nhận được trong quá trình thăm khám */
    private String symptoms;

    /** Chẩn đoán bệnh cuối cùng của bác sĩ */
    private String diagnosis;

    /** Kế hoạch điều trị được chỉ định */
    private String treatmentPlan;

    /** Các ghi chú hoặc dặn dò bổ sung từ bác sĩ */
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

    /* Thời gian tạo hồ sơ bệnh án */
    private LocalDateTime createdAt;

    /* Thời gian sửa đổi hồ sơ bệnh án */
    private LocalDateTime updatedAt;
}
