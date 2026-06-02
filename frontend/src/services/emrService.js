import axiosClient from '../api/axiosClient'

export const emrService = {
  saveEMR: (data) =>
    axiosClient.post('/v1/emr', data),

  getByAppointment: (appointmentId) =>
    axiosClient.get(`/v1/emr/appointment/${appointmentId}`),

  getPatientHistory: (patientId) =>
    axiosClient.get(`/v1/emr/patient/${patientId}/history`),
}
