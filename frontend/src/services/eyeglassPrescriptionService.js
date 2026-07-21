import axiosClient from '../api/axiosClient';

export const eyeglassPrescriptionService = {
  create: (data) => axiosClient.post('/v1/eyeglass-prescriptions', data),
  getByPatient: (patientId) => axiosClient.get(`/v1/eyeglass-prescriptions/patient/${patientId}`),
  getByMedicalRecord: (medicalRecordId) =>
    axiosClient.get(`/v1/eyeglass-prescriptions/medical-record/${medicalRecordId}`),
  getById: (id) => axiosClient.get(`/v1/eyeglass-prescriptions/${id}`),

  // Luồng Lab Technician gia công (UC-36)
  getFabricationQueue: () => axiosClient.get('/v1/eyeglass-prescriptions/fabrication-queue'),
  startFabrication: (id) => axiosClient.patch(`/v1/eyeglass-prescriptions/${id}/start-fabrication`),
  completeFabrication: (id) => axiosClient.patch(`/v1/eyeglass-prescriptions/${id}/complete-fabrication`),

  // Luồng giao kính cho Dược sĩ/Lễ tân — CHỈ áp dụng khi đơn đã READY
  getReady: () => axiosClient.get('/v1/eyeglass-prescriptions/ready'),
  dispense: (id) => axiosClient.patch(`/v1/eyeglass-prescriptions/${id}/dispense`),

  // getPending giữ lại cho tương thích ngược nếu chỗ khác còn dùng, nhưng KHÔNG dùng cho
  // luồng Dispensing nữa — PENDING giờ thuộc về hàng đợi gia công của Lab Technician
  getPending: () => axiosClient.get('/v1/eyeglass-prescriptions/pending'),
  skip: (id) => axiosClient.patch(`/v1/eyeglass-prescriptions/${id}/skip`),
};
