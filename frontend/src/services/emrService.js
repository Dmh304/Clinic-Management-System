/**
 * Tuấn - HE204215
 * 
 * Chứa các API call liên quan đến quản lý Bệnh án điện tử (EMR).
*/
import axiosClient from '../api/axiosClient'

export const emrService = {
  // Hàm lưu bệnh án (tạo mới hoặc cập nhật bệnh án)
  saveEMR: (data) =>
    axiosClient.post('/v1/emr', data),

  // Hàm lấy chi tiết bệnh án dựa theo ID của lịch hẹn
  getByAppointment: (appointmentId) =>
    axiosClient.get(`/v1/emr/appointment/${appointmentId}`),

  // Hàm lấy lịch sử khám bệnh của một bệnh nhân cụ thể
  getPatientHistory: (patientId) =>
    axiosClient.get(`/v1/emr/patient/${patientId}/history`),

  // Hàm lấy danh sách tất cả hồ sơ bệnh án đã hoàn thành
  getCompletedList: () =>
    axiosClient.get(`/v1/emr/completed`),

  // Hàm lấy lịch sử bệnh án của chính bệnh nhân đang đăng nhập
  getLoggingInPatientHistory: () =>
    axiosClient.get(`/v1/emr/history`),

  getById: (id) =>
    axiosClient.get(`/v1/emr/${id}`),

  getAllList: () =>
    axiosClient.get(`/v1/emr/all`),
}
