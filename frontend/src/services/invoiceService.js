import axiosClient from '../api/axiosClient'

export const invoiceService = {
	getAll: () => axiosClient.get('/v1/invoices'),

	search: (keyword = '') =>
		axiosClient.get('/v1/invoices/search', { params: keyword ? { keyword } : {} }),

	create: (data) => axiosClient.post('/v1/invoices', data),

	issue: (id, paymentMethod, paymentReference) =>
		axiosClient.patch(`/v1/invoices/${id}/issue`, { paymentMethod, paymentReference }),

	cancel: (id) => axiosClient.patch(`/v1/invoices/${id}/cancel`),

	getById: (id) => axiosClient.get(`/v1/invoices/${id}`),

	// Gợi ý khoản phí cho lịch hẹn (dịch vụ khám + thuốc bác sĩ đã kê) — đổ sẵn vào modal thu phí
	getSuggestedItems: (appointmentId) =>
		axiosClient.get(`/v1/invoices/appointment/${appointmentId}/suggested-items`),

	downloadPdf: (id) =>
		axiosClient.get(`/v1/invoices/${id}/pdf`, { responseType: 'blob' }),

	sendEmail: (id) => axiosClient.post(`/v1/invoices/${id}/send-email`),

	getMy: () => axiosClient.get('/v1/invoices/my'),
}
