/**
 * @author  ThangNB - HE201024
 * @created 2026-07-19
 * @updated 2026-07-19
 *
 * API client for the Clinic Manager's reports — UC-49 (operational
 * dashboard), UC-50 (revenue), UC-51 (patient statistics), UC-52 (staff
 * performance) and UC-53 (feedback), plus their CSV exports.
 *
 * All endpoints are read-only; access is restricted to MANAGER / ADMIN
 * server-side.
 */
import axiosClient from '../api/axiosClient'

/**
 * Builds the axios params for a date range, omitting empty bounds so the
 * backend applies its own default (first of this month → today).
 *
 * @param {string} [from] ISO yyyy-MM-dd start
 * @param {string} [to]   ISO yyyy-MM-dd end
 * @returns {{params: Object}} axios config fragment
 */
const range = (from, to) => {
  const p = {}
  if (from) p.from = from
  if (to) p.to = to
  return { params: p }
}

export const reportService = {
  /** UC-49: today's live operational figures. @returns {Promise} dashboard widgets */
  operationalDashboard: () => axiosClient.get('/v1/reports/dashboard'),

  /** UC-50: revenue by service, doctor and payment method.
   *  @param {string} [from] @param {string} [to] @returns {Promise} */
  revenue: (from, to) => axiosClient.get('/v1/reports/revenue', range(from, to)),

  /** UC-51: patient volume, new vs returning, top diagnoses.
   *  @param {string} [from] @param {string} [to] @returns {Promise} */
  patientStatistics: (from, to) => axiosClient.get('/v1/reports/patient-statistics', range(from, to)),

  /** UC-52: per-doctor KPIs.
   *  @param {string} [from] @param {string} [to] @returns {Promise} */
  staffPerformance: (from, to) => axiosClient.get('/v1/reports/staff-performance', range(from, to)),

  /** UC-53: aggregated patient feedback.
   *  @param {string} [from] @param {string} [to] @returns {Promise} */
  feedbackReport: (from, to) => axiosClient.get('/v1/reports/feedback', range(from, to)),

  // ── Exports, resolving to a Blob ──
  // Note: the backend emits UTF-8 CSV, whereas UC-50 step 6 specifies .xlsx.

  /** UC-50: exports the revenue report. @returns {Promise<Blob>} */
  exportRevenue: (from, to) =>
    axiosClient.get('/v1/reports/revenue/export', { ...range(from, to), responseType: 'blob' }),
  /** UC-51: exports the patient statistics. @returns {Promise<Blob>} */
  exportPatientStatistics: (from, to) =>
    axiosClient.get('/v1/reports/patient-statistics/export', { ...range(from, to), responseType: 'blob' }),

  /** UC-53: exports the feedback report. @returns {Promise<Blob>} */
  exportFeedback: (from, to) =>
    axiosClient.get('/v1/reports/feedback/export', { ...range(from, to), responseType: 'blob' }),
}

/**
 * Triggers a browser download for a Blob returned by one of the export calls.
 *
 * The object URL is revoked on a delay rather than immediately, because
 * revoking it before the browser has started the download cancels the save in
 * some browsers.
 *
 * @param {Blob} blob     file contents
 * @param {string} filename name offered to the user
 */
export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  setTimeout(() => URL.revokeObjectURL(url), 60000)
}
