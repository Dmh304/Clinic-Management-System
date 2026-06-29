package com.ecms.dto.request;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
public class BookAppointmentRequest {

    @NotNull(message = "doctorId không được để trống")
    private Long doctorId;

    @NotNull(message = "appointmentTime không được để trống")
    private LocalDateTime appointmentTime;

    // Mô tả triệu chứng / lý do khám (không bắt buộc)
    private String notes;

    // Dịch vụ khám gắn kèm (UC-46) — tuỳ chọn, null nếu đặt lịch khám thường
    private Long serviceId;

    // ─── Thông tin người khám (UC-11) ────────────────────────────────
    // bookingForOther = true → đặt hộ người thân: tạo hồ sơ Patient mới (không gắn
    // tài khoản) từ các trường patient* bên dưới, và lưu người đặt vào booked_by.
    // bookingForOther = false → đặt cho mình: dùng hồ sơ Patient của tài khoản,
    // và bổ sung các trường còn trống (giới tính/ngày sinh/địa chỉ) nếu có gửi lên.
    private boolean bookingForOther;

    private String patientName;
    private String patientGender; // MALE | FEMALE | OTHER
    private LocalDate patientDob;
    private String patientPhone;
    private String patientEmail;
    private String patientAddress;
}
