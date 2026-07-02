/**
 * Author: TuanTD
 * 
 * File dịch vụ (Service Layer) quản lý toàn bộ các yêu cầu HTTP (API Calls)
 * liên quan đến Quản lý Phiếu xét nghiệm / Đo khám cận lâm sàng (Lab Order)
 * Sử dụng cấu hình `axiosClient` đã được thiết lập sẵn mã hóa interceptor và base URL
 */
import axiosClient from '../api/axiosClient'

export const labService = {

    /* Tạo mới một phiếu chỉ định xét nghiệm */
    createLabOrder: (data) =>
        axiosClient.post(`/v1/lab`, data),

    /* Lấy danh sách hàng đợi các ca xét nghiệm (Lab Queue) */
    getLabOrderQueue: () =>
        axiosClient.get(`/v1/lab/queue`),

    /* 3. Nộp kết quả xét nghiệm chính thức */
    submitResult: (id, data) =>
        axiosClient.put(`/v1/lab/${id}/result`, data),

    /* Lấy danh sách phiếu xét nghiệm theo ID của Hồ sơ bệnh án (EMR) */
    getLabOrdersForMedicalRecord: (medicalRecordId) =>
        axiosClient.get(`/v1/lab/emr/${medicalRecordId}`),

    /* Lấy chi tiết kết quả đo khám/thông số mắt của một phiếu xét nghiệm */
    getLabResults: (id) =>
        axiosClient.get(`/v1/lab/${id}/results`),

    /* Duyệt chấp nhận kết quả xét nghiệm */
    approveLabResult: (id) =>
        axiosClient.put(`/v1/lab/${id}/approve`),

    /* Từ chối kết quả và Yêu cầu làm lại xét nghiệm */
    requestRetest: (id, data) =>
        axiosClient.put(`/v1/lab/${id}/retest`, data),

    /* Tiếp nhận và Bắt đầu thực hiện ca xét nghiệm */
    startLabOrder: (id) =>
        axiosClient.put(`/v1/lab/${id}/start`),

    /* Lấy danh sách các Kỹ thuật viên xét nghiệm đang hoạt động (Active) */
    getActiveLabTechnicians: () =>
        axiosClient.get(`/v1/lab/technicians`),

    /* Lấy danh sách phiếu xét nghiệm thuộc quản lý của chính Bác sĩ đang đăng nhập */
    getLabOrdersForDoctor: () =>
        axiosClient.get(`/v1/lab/doctor`),

    /* Lưu nháp kết quả xét nghiệm (Save Draft) */
    saveDraft: (id, data) =>
        axiosClient.put(`/v1/lab/${id}/draft`, data),

}