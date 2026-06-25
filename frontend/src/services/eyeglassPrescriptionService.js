import axiosClient from '../api/axiosClient';

export const eyeglassPrescriptionService = {
  create: (data) => axiosClient.post('/v1/eyeglass-prescriptions', data),
  getByPatient: (patientId) => axiosClient.get(`/v1/eyeglass-prescriptions/patient/${patientId}`),
};
