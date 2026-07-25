/**
 * Service quản lý các yêu cầu HTTP liên quan đến Đơn đặt kính (EyeglassOrder).
 * Đây là entity có vòng đời PENDING_CONFIRMATION -> PENDING_LAB -> IN_PRODUCTION -> READY -> DISPENSED,
 * khác với EyeglassPrescription (chỉ chứa thông số lâm sàng do bác sĩ kê, readonly).
 */
import axiosClient from '../api/axiosClient'

export const eyeglassOrderService = {
  create: (data) => axiosClient.post('/v1/eyeglass-orders', data),
  getById: (id) => axiosClient.get(`/v1/eyeglass-orders/${id}`),
  getByPatient: (patientId) => axiosClient.get(`/v1/eyeglass-orders/patient/${patientId}`),
  getPending: () => axiosClient.get('/v1/eyeglass-orders/pending'),
  confirmOnline: (id) => axiosClient.patch(`/v1/eyeglass-orders/${id}/confirm`),
  update: (id, data) => axiosClient.put(`/v1/eyeglass-orders/${id}`, data),
  cancel: (id, cancelReason) => axiosClient.patch(`/v1/eyeglass-orders/${id}/cancel`, { cancelReason }),
  dispense: (id) => axiosClient.put(`/v1/eyeglass-orders/${id}/pickup`),

  // Luồng gia công của Lab Technician (PENDING_LAB -> IN_PRODUCTION -> READY)
  getFabricationQueue: () => axiosClient.get('/v1/eyeglass-orders/fabrication-queue'),
  startFabrication: (id) => axiosClient.patch(`/v1/eyeglass-orders/${id}/start-fabrication`),
  completeFabrication: (id) => axiosClient.patch(`/v1/eyeglass-orders/${id}/complete-fabrication`),
}