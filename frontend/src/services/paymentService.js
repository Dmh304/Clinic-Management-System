/**
 * @author  ThangNB - HE201024
 * @created 2026-07-11
 * @updated 2026-07-17
 *
 * API client for automated VietQR settlement
 * (UC-23 Process Payment, ALT-2 QR Code / Bank Transfer).
 *
 * Flow: the Receptionist creates a draft invoice → a QR code is shown whose
 * transfer memo is the invoice code → the patient scans and transfers → the
 * gateway posts a webhook to the backend → the backend settles the invoice →
 * this client's polling sees paid = true.
 */
import axiosClient from '../api/axiosClient'

export const paymentService = {
	/**
	 * Checks whether the gateway has confirmed payment for an invoice.
	 * Called about every 3 seconds while the QR code is on screen
	 * (UC-23 ALT-2 step 4).
	 *
	 * @param {number} invoiceId invoice being paid
	 * @returns {Promise} payment state; the `paid` flag ends the polling loop
	 *
	 * Validate: read-only. Settlement itself is decided by the backend under
	 * BR-10 (full payment only) — this endpoint never marks anything as paid.
	 */
	getStatus: (invoiceId) => axiosClient.get(`/v1/payments/invoice/${invoiceId}/status`),
}
