/**
 * Author: TuanTD
 * 
 * File dịch vụ (Service Layer) quản lý toàn bộ các yêu cầu HTTP (API Calls)
 * liên quan đến Hồ sơ Bệnh án điện tử (Electronic Medical Record - EMR).
 * Sử dụng cấu hình `axiosClient` đã được thiết lập sẵn mã hóa interceptor và base URL.
 */
import axiosClient from '../api/axiosClient'

export const emrService = {
  
  /* Lưu hồ sơ bệnh án (Tạo mới hoặc Cập nhật dữ liệu) */
  saveEMR: (data) =>
    axiosClient.post('/v1/emr', data),

  /* Lấy chi tiết hồ sơ bệnh án dựa theo ID của Lịch hẹn */
  getByAppointment: (appointmentId) =>
    axiosClient.get(`/v1/emr/appointment/${appointmentId}`),

  /* Lấy toàn bộ lịch sử khám bệnh của một bệnh nhân cụ thể */
  getPatientHistory: (patientId) =>
    axiosClient.get(`/v1/emr/patient/${patientId}/history`),

  /* Lấy danh sách tất cả các hồ sơ bệnh án đã hoàn thành trên hệ thống */
  getCompletedList: () =>
    axiosClient.get(`/v1/emr/completed`),

  /* Lấy lịch sử bệnh án của chính bệnh nhân hiện tại đang đăng nhập */
  getLoggingInPatientHistory: () =>
    axiosClient.get(`/v1/emr/history`),

  /* Lấy chi tiết một hồ sơ bệnh án cụ thể theo mã ID EMR */
  getById: (id) =>
    axiosClient.get(`/v1/emr/${id}`),

  /* Lấy toàn bộ danh sách hồ sơ bệnh án không phân biệt trạng thái */
  getAllList: () =>
    axiosClient.get(`/v1/emr/all`),
}