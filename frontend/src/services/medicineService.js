import axiosClient from '../api/axiosClient';

export const medicineService = {
  getAll: (keyword = '') => axiosClient.get('/v1/medicines', { params: { keyword } })
};
