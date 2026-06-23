import axiosClient from '../api/axiosClient'

export const invoiceService = {
  getAll: () =>
    axiosClient.get('/v1/invoices'),

  search: (keyword) =>
    axiosClient.get('/v1/invoices/search', { params: { keyword } }),

  getById: (id) =>
    axiosClient.get(`/v1/invoices/${id}`),

  getByAppointmentId: (appointmentId) =>
    axiosClient.get(`/v1/invoices/appointment/${appointmentId}`),

  create: (data) =>
    axiosClient.post('/v1/invoices', data),

  issue: (id, paymentMethod, paymentReference) =>
    axiosClient.patch(`/v1/invoices/${id}/issue`, { paymentMethod, paymentReference }),

  cancel: (id) =>
    axiosClient.patch(`/v1/invoices/${id}/cancel`),

  sendEmail: (id) =>
    axiosClient.post(`/v1/invoices/${id}/send-email`, {}, { timeout: 30000 }),

  downloadPdf: (id) =>
    axiosClient.get(`/v1/invoices/${id}/pdf`, { responseType: 'blob' }),
}
