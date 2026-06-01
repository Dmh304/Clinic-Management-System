import axiosClient from '../api/axiosClient'

export const patientService = {
  createWalkInPatient: (data) =>
    axiosClient.post('/v1/patients/walk-in', data),

  searchPatients: (keyword) =>
    axiosClient.get('/v1/patients/search', { params: keyword ? { keyword } : {} }),
}
