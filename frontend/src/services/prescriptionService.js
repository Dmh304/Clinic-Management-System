//Author: DucTKH - HE204463
//Created: 2026-06-22
//Last Update: 2026-07-21
// Service xử lý gọi API cho Đơn thuốc
import axiosClient from '../api/axiosClient';

export const prescriptionService = {
  create: (data) => axiosClient.post('/v1/prescriptions', data),
  getByPatient: (patientId) => axiosClient.get(`/v1/prescriptions/patient/${patientId}`),
  getPending: () => axiosClient.get('/v1/prescriptions/pending'),
  dispense: (id, payload) => axiosClient.patch(`/v1/prescriptions/${id}/dispense`, payload),
  skip: (id) => axiosClient.patch(`/v1/prescriptions/${id}/skip`),
  delete: (id) => axiosClient.delete(`/v1/prescriptions/${id}`),
  downloadPdf: (id, hideSignature = false) => axiosClient.get(`/v1/prescriptions/${id}/pdf?hideSignature=${hideSignature}`, { responseType: 'blob' }),
};
