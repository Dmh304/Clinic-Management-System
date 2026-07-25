import axiosClient from '../api/axiosClient';

export const eyeglassPrescriptionService = {
  create: (data) => axiosClient.post('/v1/eyeglass-prescriptions', data),
  getByPatient: (patientId) => axiosClient.get(`/v1/eyeglass-prescriptions/patient/${patientId}`),
  getByMedicalRecord: (medicalRecordId) =>
    axiosClient.get(`/v1/eyeglass-prescriptions/medical-record/${medicalRecordId}`),
  getById: (id) => axiosClient.get(`/v1/eyeglass-prescriptions/${id}`),

  // getPending giữ lại cho tương thích ngược nếu chỗ khác còn dùng, nhưng KHÔNG dùng cho
  // luồng Dispensing nữa — PENDING giờ thuộc về hàng đợi gia công của Lab Technician
  getPending: () => axiosClient.get('/v1/eyeglass-prescriptions/pending'),
  
};
