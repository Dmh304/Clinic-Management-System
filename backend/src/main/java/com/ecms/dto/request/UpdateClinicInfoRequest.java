// UC-56 - Configure System and Data
package com.ecms.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class UpdateClinicInfoRequest {

    @NotBlank(message = "Tên phòng khám không được để trống")
    private String clinicName;

    @NotBlank(message = "Số điện thoại không được để trống")
    private String clinicPhone;

    @NotBlank(message = "Địa chỉ không được để trống")
    private String clinicAddress;

    @NotBlank(message = "Giờ làm việc không được để trống")
    private String clinicHours;
}
