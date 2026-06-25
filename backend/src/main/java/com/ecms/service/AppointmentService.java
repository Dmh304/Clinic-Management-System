/**
 * Author: TuanTD
 * 
 * Interface Service định nghĩa các nghiệp vụ cốt lõi liên quan đến quản lý Lịch hẹn (Appointment)
 * Xử lý toàn bộ các luồng trạng thái lịch hẹn từ lúc đặt lịch (Online/Walk-in), Check-in, 
 * Phân công điều phối bác sĩ, cho đến thống kê dữ liệu báo cáo Dashboard.
 */

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

    /* Lấy danh sách tất cả các lịch hẹn trong ngày hôm nay */
    List<AppointmentResponse> getTodayAppointments();

    /* Cập nhật trạng thái thủ công cho một lịch hẹn cụ thể */
    AppointmentResponse updateAppointmentStatus(Long id, AppointmentStatus status);

    /* Lấy toàn bộ danh sách lịch hẹn lưu trữ trên hệ thống */
    List<AppointmentResponse> getAllAppointments();

    /* Lấy danh sách lịch sử lịch hẹn của một bệnh nhân cụ thể */
    List<AppointmentResponse> getMyAppointments(Long patientId);

    /* Xác nhận lịch hẹn trực tuyến và phân công bác sĩ phụ trách */
    AppointmentResponse confirmAppointment(Long id, Long doctorId);

    /* Thực hiện thủ tục Check-in khi bệnh nhân đến phòng khám thực tế */
    AppointmentResponse checkInAppointment(Long id);

    /* Tìm kiếm lịch hẹn linh hoạt theo từ khóa tìm kiếm (Keyword) */
    List<AppointmentResponse> searchAppointments(String keyword);

    /*
     * Lấy danh sách hàng đợi khám tổng quát của toàn bộ phòng khám theo ngày cụ thể
     */
    List<AppointmentResponse> getDoctorQueue(LocalDate date);

    /* Tạo mới một lịch hẹn trực tiếp tại quầy (Walk-in Appointment) */
    AppointmentResponse createWalkInAppointment(WalkInAppointmentRequest request);

    /* Đặt lịch khám trực tuyến (Online Booking) dành cho khách hàng/bệnh nhân */
    AppointmentResponse bookOnlineAppointment(BookAppointmentRequest request, String patientEmail);

    /* Lấy dữ liệu thống kê tổng hợp (Dashboard) của toàn phòng khám theo ngày */
    AppointmentDashboardResponse getDashboard(LocalDate date);

    /* Lấy danh sách hàng đợi khám riêng biệt của một Bác sĩ cụ thể trong ngày */
    List<AppointmentResponse> getDoctorQueue(LocalDate date, Long doctorId);

    /* Lấy dữ liệu thống kê (Dashboard) cá nhân của một Bác sĩ cụ thể theo ngày */
    AppointmentDashboardResponse getDashboard(LocalDate date, Long doctorId);

    /* Điều chuyển hoặc đổi lịch hẹn sang một bác sĩ hoặc khung giờ khác */
    AppointmentResponse reassignAppointment(Long id, ReassignAppointmentRequest request);

    /* Lấy danh sách lịch trình phân bổ làm việc chi tiết theo từng ngày */
    List<AppointmentResponse> getDailySchedule(LocalDate date);

    /*
     * Lấy danh sách lịch hẹn nằm trong một khoảng ngày cụ thể từ [startDate] đến
     * [endDate]
     */
    List<AppointmentResponse> getScheduleRange(LocalDate startDate, LocalDate endDate);
}