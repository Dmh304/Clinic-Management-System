/**
 * @author  ThangNB - HE201024
 * @created 2026-07-19
 * @updated 2026-07-20
 *
 * API client for patient feedback (UC-48 Submit Feedback).
 * Every endpoint is scoped to the signed-in patient server-side, so no
 * patient id is ever sent from here.
 */
import axiosClient from '../api/axiosClient'

export const feedbackService = {
  /**
   * Submits feedback for a completed visit.
   * @param {{appointmentId:number, rating:number, content?:string, isAnonymous?:boolean}} data
   * @returns {Promise} the stored feedback (status PENDING)
   *
   * Validate: rating is required and must be 1..5, checked in the form and
   * again by the backend (UC-48 E1). BR-21 (one feedback per appointment) is
   * enforced server-side and surfaces here as an error response.
   */
  submit: (data) => axiosClient.post('/v1/feedbacks', data),

  /**
   * Lists the signed-in patient's own submitted feedback.
   * @returns {Promise} that patient's feedback only
   */
  getMy: () => axiosClient.get('/v1/feedbacks/my'),

  /**
   * Loads the staff who took part in a visit (doctor, receptionist, lab
   * technician) so the form can offer a rating per person.
   * @param {number} appointmentId the visit being rated
   * @returns {Promise} visit summary plus participant list
   */
  getParticipants: (appointmentId) =>
    axiosClient.get(`/v1/feedbacks/appointment/${appointmentId}/participants`),
}
