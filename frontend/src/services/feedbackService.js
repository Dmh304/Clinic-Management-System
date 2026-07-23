// UC-48: Bệnh nhân gửi và xem đánh giá sau buổi khám.
import axiosClient from '../api/axiosClient'

export const feedbackService = {
  // Gửi đánh giá: { appointmentId, rating, content, isAnonymous }
  submit: (data) => axiosClient.post('/v1/feedbacks', data),
  // Danh sách đánh giá đã gửi của bệnh nhân
  getMy: () => axiosClient.get('/v1/feedbacks/my'),
  // Người tham gia buổi khám (bác sĩ, lễ tân, KTV) để hiển thị khi đánh giá
  getParticipants: (appointmentId) =>
    axiosClient.get(`/v1/feedbacks/appointment/${appointmentId}/participants`),
}
