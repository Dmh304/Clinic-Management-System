package com.ecms.service;

import com.ecms.dto.request.BookAppointmentRequest;
import com.ecms.dto.request.CancelAppointmentRequest;
import com.ecms.dto.request.ReassignAppointmentRequest;
import com.ecms.dto.request.RescheduleAppointmentRequest;
import com.ecms.dto.request.UpdateAppointmentNotesRequest;
import com.ecms.dto.request.WalkInAppointmentRequest;
import com.ecms.dto.response.AppointmentDashboardResponse;
import com.ecms.dto.response.AppointmentResponse;
import com.ecms.entity.AppointmentStatus;

import java.time.LocalDate;
import java.util.List;

public interface AppointmentService {

    List<AppointmentResponse> getTodayAppointments();

    AppointmentResponse updateAppointmentStatus(Long id, AppointmentStatus status);

    List<AppointmentResponse> getAllAppointments();

    List<AppointmentResponse> getMyAppointments(Long patientId);

    // Xác nhận lịch hẹn và phân công bác sĩ phụ trách (nếu có)
    AppointmentResponse confirmAppointment(Long id, Long doctorId);

    /**
     * UC-15: Check-in bệnh nhân tại quầy. Cấp số thứ tự hàng đợi theo bác sĩ + ngày
     * (BR-13) và lưu lại id nhân viên thực hiện check-in.
     */
    AppointmentResponse checkInAppointment(Long id, Long checkInByUserId);

    List<AppointmentResponse> searchAppointments(String keyword);

    List<AppointmentResponse> getDoctorQueue(LocalDate date);

    AppointmentResponse createWalkInAppointment(WalkInAppointmentRequest request);

    AppointmentResponse bookOnlineAppointment(BookAppointmentRequest request, String patientEmail);

    AppointmentDashboardResponse getDashboard(LocalDate date);

    List<AppointmentResponse> getDoctorQueue(LocalDate date, Long doctorId);

    AppointmentDashboardResponse getDashboard(LocalDate date, Long doctorId);

    AppointmentResponse reassignAppointment(Long id, ReassignAppointmentRequest request);

    List<AppointmentResponse> getDailySchedule(LocalDate date);

    /**
     * Lịch hẹn trong khoảng ngày [startDate, endDate] — dùng cho calendar view
     * tuần/tháng
     */
    List<AppointmentResponse> getScheduleRange(LocalDate startDate, LocalDate endDate);

    /**
     * Huỷ lịch hẹn. isPatientSelf=true áp dụng BR-05 (không huỷ trễ hơn 1h trước
     * giờ khám) và kiểm tra quyền sở hữu lịch hẹn.
     */
    AppointmentResponse cancelAppointment(Long id, CancelAppointmentRequest request, String actingUserEmail,
            boolean isPatientSelf);

    /** Bệnh nhân tự đổi giờ khám (giữ nguyên bác sĩ) trong giới hạn cho phép */
    AppointmentResponse reschedulePatientAppointment(Long id, RescheduleAppointmentRequest request,
            String patientEmail);

    /** Lễ tân ghi chú thêm cho lịch hẹn, không đổi trạng thái */
    AppointmentResponse updateAppointmentNotes(Long id, UpdateAppointmentNotesRequest request);

    /** Lấy chi tiết 1 lịch hẹn theo id (dùng cho modal chi tiết). */
    AppointmentResponse getAppointmentById(Long id);

    /**
     * UC-13: Gửi nhắc lịch cho 1 lịch hẹn — gửi email cho bệnh nhân, đặt
     * reminderSent=true và tạo thông báo cho Lễ tân. Dùng cho cả cron job
     * lẫn endpoint nhắc thủ công (bỏ qua điều kiện cửa sổ 24h).
     */
    AppointmentResponse sendReminder(Long id);
}