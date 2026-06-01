import axiosClient from '../api/axiosClient'

export const doctorService = {
  getAllDoctors: () =>
    axiosClient.get('/v1/doctors'),
}
