/**
 * @author      ThangNB - HE201024
 * @contributor Đồng Mạnh Hùng - HE200743
 * @created     2026-07-11
 * @updated     2026-07-18
 *
 * API client for the billing module — UC-23 (Process Payment) and
 * UC-24 (Deliver Invoice).
 *
 * Validate: every business rule (BR-10 full payment, BR-11 total formula,
 * BR-15 single discount, BR-09 soft cancel) is enforced by the backend. This
 * layer only shapes requests; it must not be treated as the guard.
 */
import axiosClient from '../api/axiosClient'

export const invoiceService = {
	/**
	 * Lists all invoices without charge lines, for the history table.
	 * @returns {Promise} invoices, newest first
	 */
	getAll: () => axiosClient.get('/v1/invoices'),

	/**
	 * Searches invoices by patient name, phone or invoice code.
	 * @param {string} [keyword] blank returns the full list
	 * @returns {Promise} matching invoices
	 */
	search: (keyword = '') =>
		axiosClient.get('/v1/invoices/search', { params: keyword ? { keyword } : {} }),

	/**
	 * Creates a DRAFT invoice from the lines entered by the Receptionist.
	 * @param {{appointmentId:number, items:Array, discountAmount?:number, paymentMethod?:string}} data
	 * @returns {Promise} the created invoice (DRAFT / UNPAID)
	 *
	 * Validate: BR-11 — the total is recomputed server-side, so the client
	 * never sends one; UC-23 E1 — a duplicate for the same visit is rejected.
	 */
	create: (data) => axiosClient.post('/v1/invoices', data),

	/**
	 * Records payment and issues the invoice (DRAFT → ISSUED, → PAID).
	 * @param {number} id invoice id
	 * @param {string} paymentMethod CASH or VIET_QR
	 * @param {string} [paymentReference] bank reference for transfers
	 * @returns {Promise} the issued invoice
	 *
	 * Validate: BR-10 — a VietQR invoice awaiting the bank cannot be issued
	 * this way; only the gateway webhook may settle it.
	 */
	issue: (id, paymentMethod, paymentReference) =>
		axiosClient.patch(`/v1/invoices/${id}/issue`, { paymentMethod, paymentReference }),

	/**
	 * Voids a draft invoice.
	 * @param {number} id invoice id
	 * @returns {Promise} the cancelled invoice
	 *
	 * Validate: BR-09 — a soft cancel; the row is kept for the audit trail.
	 */
	cancel: (id) => axiosClient.patch(`/v1/invoices/${id}/cancel`),

	/**
	 * Loads one invoice with all charge lines.
	 * @param {number} id invoice id
	 * @returns {Promise} the invoice detail
	 */
	getById: (id) => axiosClient.get(`/v1/invoices/${id}`),

	/**
	 * Suggested charge lines for a visit — booked service plus prescribed
	 * medicines — used to prefill the payment modal (UC-23 step 2).
	 * @param {number} appointmentId visit id
	 * @returns {Promise} suggested lines
	 */
	getSuggestedItems: (appointmentId) =>
		axiosClient.get(`/v1/invoices/appointment/${appointmentId}/suggested-items`),

	/**
	 * Downloads the invoice PDF (UC-24 ALT-1 / ALT-2).
	 * @param {number} id invoice id
	 * @returns {Promise} the PDF as a Blob
	 */
	downloadPdf: (id) =>
		axiosClient.get(`/v1/invoices/${id}/pdf`, { responseType: 'blob' }),

	/**
	 * Emails the e-invoice to the patient (UC-24).
	 * @param {number} id invoice id
	 * @returns {Promise} resolves once the send is queued, not delivered —
	 *   the actual SMTP result arrives later as emailStatus SENT / FAILED
	 */
	sendEmail: (id) => axiosClient.post(`/v1/invoices/${id}/send-email`),

	/**
	 * The signed-in patient's own invoices (UC-24 ALT-2).
	 * @returns {Promise} that patient's invoices
	 *
	 * Validate: BR-08 — scoped server-side from the auth token, no id is sent.
	 */
	getMy: () => axiosClient.get('/v1/invoices/my'),
}
