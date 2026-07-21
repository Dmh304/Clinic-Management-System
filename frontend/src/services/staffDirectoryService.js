// staffDirectoryService.js
//
// ⚠️ PLACEHOLDER — cần xác nhận/nối endpoint thật trước khi dùng production.
//
// Room Roster (UC-56) cần danh sách Doctor/Nurse/Lab Technician đang hoạt
// động để Manager chọn khi phân trực phòng. Doctor đã có sẵn qua
// `doctorService.getAllDoctors()`. Hai cái dưới đây CHƯA CHẮC CHẮN tồn tại
// đúng path này trong backend hiện tại — kiểm tra lại với người phụ trách
// StaffController/LabOrderController trước khi merge:
//
// 1. GET /v1/lab/technicians hiện đang @PreAuthorize("hasAnyRole('DOCTOR')")
//    trong LabOrderController.java -> Manager gọi sẽ bị 403. Cần nới quyền
//    thành hasAnyRole('DOCTOR','MANAGER','ADMIN'), hoặc tạo endpoint riêng.
// 2. GET /v1/staffs?position=NURSE — chưa rõ có StaffController nào expose
//    endpoint này chưa. Nếu chưa có, cần thêm.
import axiosClient from '../api/axiosClient'

export const staffDirectoryService = {
  getActiveNurses: () =>
    // TODO: xác nhận path thật — tạm giả định StaffController có endpoint
    // lọc theo position. Nếu backend trả về TẤT CẢ staff (không lọc), cần
    // filter phía client theo s.position === 'NURSE'.
    axiosClient.get('/v1/staffs', { params: { position: 'NURSE', status: 'ACTIVE' } }),

  getActiveLabTechnicians: () =>
    // TODO: hiện endpoint này khoá @PreAuthorize('DOCTOR') — cần nới quyền
    // trước khi Manager gọi được, xem ghi chú đầu file.
    axiosClient.get('/v1/lab/technicians'),
}