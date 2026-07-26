/**
 * @author  ThangNB - HE201024
 * @created 2026-07-19
 * @updated 2026-07-19
 *
 * API client for payroll approval (UC-54 Approve Payroll).
 *
 * Validate: BR-17 (only the Clinic Manager may approve) and BR-09 (approved
 * lines are locked) are both enforced server-side; failures surface here as
 * error responses rather than being pre-checked in the UI.
 */
import axiosClient from '../api/axiosClient'

export const payrollService = {
  /**
   * Generates or regenerates the DRAFT payroll for a month.
   * @param {number} year  pay period year
   * @param {number} month pay period month, 1-12
   * @returns {Promise} the draft period with its lines
   */
  generate: (year, month) => axiosClient.post('/v1/payroll/generate', null, { params: { year, month } }),

  /**
   * Lists pay periods, newest first.
   * @returns {Promise} period summaries
   */
  listPeriods: () => axiosClient.get('/v1/payroll/periods'),

  /**
   * Loads one period with all its payroll lines.
   * @param {number} id pay period id
   * @returns {Promise} the period and its lines
   */
  getPeriod: (id) => axiosClient.get(`/v1/payroll/periods/${id}`),

  /**
   * Applies a Manager override to one payroll line.
   * @param {number} id payroll line id
   * @param {{baseSalary?:number, performanceBonus?:number, deduction?:number, note?:string}} data
   * @returns {Promise} the updated line
   *
   * Validate: BR-09 — rejected by the backend once the period is APPROVED.
   */
  updateItem: (id, data) => axiosClient.patch(`/v1/payroll/items/${id}`, data),

  /**
   * Approves a pay period, locking every line (UC-54 step 4).
   * @param {number} id pay period id
   * @returns {Promise} the approved period
   *
   * Validate: BR-17 — the approving manager is taken from the auth token
   * server-side, not sent from here.
   */
  approve: (id) => axiosClient.post(`/v1/payroll/periods/${id}/approve`),
}
