//Author: DucTKH - HE204463
// Le Thi Bich Ngan - HE204710
// Service gọi API bệnh nhân từ frontend.
// Cung cấp 2 hàm: tạo bệnh nhân vãng lai mới và tìm kiếm bệnh nhân theo tên/SĐT.
//Created: 2026-06-01
//Last Update: 2026-06-05
import axiosClient from '../api/axiosClient'

export const patientService = {
  /**
   * Gọi API tạo hồ sơ bệnh nhân vãng lai mới trực tiếp tại quầy.
   * DucTKH
   */
  createWalkInPatient: (data) =>
    axiosClient.post('/v1/patients/walk-in', data),

  /**
   * Gọi API tìm kiếm bệnh nhân theo tên hoặc số điện thoại.
   * DucTKH
   */
  searchPatients: (keyword) =>
    axiosClient.get('/v1/patients/search', { params: keyword ? { keyword } : {} }),
}
