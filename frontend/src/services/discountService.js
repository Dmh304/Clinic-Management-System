import axiosClient from '../api/axiosClient'

export const discountService = {
  getAll: () =>
    axiosClient.get('/v1/discount-campaigns'),

  getActive: () =>
    axiosClient.get('/v1/discount-campaigns/active'),

  getById: (id) =>
    axiosClient.get(`/v1/discount-campaigns/${id}`),

  create: (data) =>
    axiosClient.post('/v1/discount-campaigns', data),

  update: (id, data) =>
    axiosClient.put(`/v1/discount-campaigns/${id}`, data),

  delete: (id) =>
    axiosClient.delete(`/v1/discount-campaigns/${id}`),

  // UC-43: xem trước mức giảm của 1 mã cho 1 số tiền — không tăng lượt dùng
  quote: (code, amount) =>
    axiosClient.get('/v1/discount-campaigns/quote', { params: { code, amount } }),
}
