/** 
 * Author: Tuấn - HE204215
 * 
 * Định nghĩa các nghiệp vụ liên quan đến Lịch hẹn và Hàng đợi bệnh nhân.
*/
package com.ecms.service;

import com.ecms.dto.request.BookAppointmentRequest;
import com.ecms.dto.request.WalkInAppointmentRequest;
import com.ecms.dto.response.AppointmentDashboardResponse;
import com.ecms.dto.response.AppointmentResponse;
import com.ecms.entity.AppointmentStatus;

import java.time.LocalDate;
import java.util.List;

public interface AppointmentService {

    // Lấy danh sách tất cả lịch hẹn trong ngày hôm nay
    List<AppointmentResponse> getTodayAppointments();

    // Cập nhật trạng thái của một lịch hẹn
    AppointmentResponse updateAppointmentStatus(Long id, AppointmentStatus status);

    // Lấy danh sách toàn bộ lịch hẹn trong hệ thống
    List<AppointmentResponse> getAllAppointments();

    List<AppointmentResponse> getMyAppointments(Long patientId);

    // Xác nhận lịch hẹn và phân công bác sĩ phụ trách (nếu có)
    AppointmentResponse confirmAppointment(Long id, Long doctorId);

    // Xác nhận bệnh nhân đã đến phòng khám (check-in) và đưa vào hàng chờ
    AppointmentResponse checkInAppointment(Long id);

    // Tìm kiếm lịch hẹn theo từ khóa (tên bệnh nhân, số điện thoại...)
    List<AppointmentResponse> searchAppointments(String keyword);

    // Lấy danh sách hàng chờ bệnh nhân chung trong một ngày cụ thể
    List<AppointmentResponse> getDoctorQueue(LocalDate date);

    // Tạo lịch hẹn trực tiếp (Walk-in) cho bệnh nhân đến khám không đặt trước
    AppointmentResponse createWalkInAppointment(WalkInAppointmentRequest request);

    // Tạo lịch hẹn trực tuyến (Online) từ phía bệnh nhân
    AppointmentResponse bookOnlineAppointment(BookAppointmentRequest request, String patientEmail);

    // Lấy số liệu thống kê tổng hợp cho Dashboard (tổng số ca, số ca chờ, số ca
    // hoàn thành...)
    AppointmentDashboardResponse getDashboard(LocalDate date);

    // Lấy danh sách hàng chờ bệnh nhân dành riêng cho một bác sĩ cụ thể
    List<AppointmentResponse> getDoctorQueue(LocalDate date, Long doctorId);

    // Lấy số liệu thống kê Dashboard dành riêng cho một bác sĩ cụ thể
    AppointmentDashboardResponse getDashboard(LocalDate date, Long doctorId);
}