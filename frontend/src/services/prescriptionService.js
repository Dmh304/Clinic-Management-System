import axiosClient from '../api/axiosClient';

export const prescriptionService = {
  create: (data) => axiosClient.post('/v1/prescriptions', data),
  getByPatient: (patientId) => axiosClient.get(`/v1/prescriptions/patient/${patientId}`),
  getPending: () => axiosClient.get('/v1/prescriptions/pending'),
  dispense: (id) => axiosClient.patch(`/v1/prescriptions/${id}/dispense`),
  skip: (id) => axiosClient.patch(`/v1/prescriptions/${id}/skip`),
};
