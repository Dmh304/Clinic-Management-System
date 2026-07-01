// DucTKH
// DTO (Data Transfer Object) nhận dữ liệu tạo Đơn kính từ phía Frontend gửi lên.
package com.ecms.dto.request;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.Builder;
import lombok.Data;
import java.math.BigDecimal;

@Data
@Builder
public class EyeglassPrescriptionRequest {
    @NotNull(message = "Thiếu medicalRecordId")
    private Long medicalRecordId;

    @DecimalMin(value = "-20.0", message = "Độ cầu mắt phải (SPH) không hợp lệ (ngoài khoảng -20 đến 20)")
    @DecimalMax(value = "20.0", message = "Độ cầu mắt phải (SPH) không hợp lệ (ngoài khoảng -20 đến 20)")
    private BigDecimal odSph;

    @DecimalMin(value = "-10.0", message = "Độ loạn mắt phải (CYL) không hợp lệ (ngoài khoảng -10 đến 10)")
    @DecimalMax(value = "10.0", message = "Độ loạn mắt phải (CYL) không hợp lệ (ngoài khoảng -10 đến 10)")
    private BigDecimal odCyl;

    @Min(value = 0, message = "Trục loạn thị mắt phải (AXIS) phải từ 0-180")
    @Max(value = 180, message = "Trục loạn thị mắt phải (AXIS) phải từ 0-180")
    private Integer odAxis;

    @DecimalMin(value = "0.0", message = "Độ cộng thêm mắt phải (ADD) phải >= 0")
    @DecimalMax(value = "10.0", message = "Độ cộng thêm mắt phải (ADD) quá lớn")
    private BigDecimal odAdd;

    @DecimalMin(value = "-20.0", message = "Độ cầu mắt trái (SPH) không hợp lệ (ngoài khoảng -20 đến 20)")
    @DecimalMax(value = "20.0", message = "Độ cầu mắt trái (SPH) không hợp lệ (ngoài khoảng -20 đến 20)")
    private BigDecimal osSph;

    @DecimalMin(value = "-10.0", message = "Độ loạn mắt trái (CYL) không hợp lệ (ngoài khoảng -10 đến 10)")
    @DecimalMax(value = "10.0", message = "Độ loạn mắt trái (CYL) không hợp lệ (ngoài khoảng -10 đến 10)")
    private BigDecimal osCyl;

    @Min(value = 0, message = "Trục loạn thị mắt trái (AXIS) phải từ 0-180")
    @Max(value = 180, message = "Trục loạn thị mắt trái (AXIS) phải từ 0-180")
    private Integer osAxis;

    @DecimalMin(value = "0.0", message = "Độ cộng thêm mắt trái (ADD) phải >= 0")
    @DecimalMax(value = "10.0", message = "Độ cộng thêm mắt trái (ADD) quá lớn")
    private BigDecimal osAdd;

    @NotNull(message = "Thiếu PD (Pupillary Distance)")
    @DecimalMin(value = "30.0", message = "Khoảng cách đồng tử (PD) quá nhỏ, không hợp lý")
    @DecimalMax(value = "90.0", message = "Khoảng cách đồng tử (PD) quá lớn, không hợp lý")
    private BigDecimal pd;

    @NotNull(message = "Thiếu loại tròng kính")
    private String lensType;

    private String notes;
}
