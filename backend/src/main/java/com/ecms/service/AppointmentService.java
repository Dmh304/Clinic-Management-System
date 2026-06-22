package com.ecms.service;

import com.ecms.dto.request.BookAppointmentRequest;
import com.ecms.dto.request.ReassignAppointmentRequest;
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

    AppointmentResponse checkInAppointment(Long id);

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
}