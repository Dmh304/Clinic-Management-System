// UC-13: Service gọi API thông báo.
// Vai trò nhận thông báo được backend suy ra từ token đăng nhập nên không cần
// truyền role từ client. axiosClient trả về thẳng envelope { success, message, data }.

import axiosClient from '../api/axiosClient'

export const notificationService = {
  // Danh sách thông báo của người dùng hiện tại (mới nhất trước)
  getAll: () =>
    axiosClient.get('/v1/notifications'),

  // Số lượng thông báo chưa đọc
  getUnreadCount: () =>
    axiosClient.get('/v1/notifications/unread-count'),

  // Đánh dấu 1 thông báo là đã đọc
  markAsRead: (id) =>
    axiosClient.patch(`/v1/notifications/${id}/read`),

  // Đánh dấu đã đọc toàn bộ thông báo của người dùng hiện tại
  markAllAsRead: () =>
    axiosClient.patch('/v1/notifications/mark-all-read'),
}
