// Le Thi Bich Ngan - HE204710
// Service gọi API bệnh nhân từ frontend.
// Cung cấp 2 hàm: tạo bệnh nhân vãng lai mới và tìm kiếm bệnh nhân theo tên/SĐT.

import axiosClient from '../api/axiosClient'

export const patientService = {
  // Gọi API tạo bệnh nhân vãng lai mới với dữ liệu lễ tân nhập vào
  createWalkInPatient: (data) =>
    axiosClient.post('/v1/patients/walk-in', data),

  // Gọi API tìm kiếm bệnh nhân; không truyền keyword thì lấy toàn bộ danh sách
  searchPatients: (keyword) =>
    axiosClient.get('/v1/patients/search', { params: keyword ? { keyword } : {} }),
}
