/**
 * Author: TuanTD
 * 
 * Định nghĩa các trạng thái của một đơn yêu cầu xét nghiệm (Lab Order)
 */

package com.ecms.entity;

public enum LabOrderStatus {
    PENDING,                // Đơn xét nghiệm mới được tạo, đang chờ tiếp nhận
    IN_PROGRESS,            // Kỹ thuật viên đã tiếp nhận và đang tiến hành phân tích/xử lý xét nghiệm
    SUBMITTED,              // Đã có kết quả xét nghiệm và đã gửi lên để bác sĩ chỉ định duyệt
    APPROVED,               // Bác sĩ đã kiểm tra và chấp nhận/phê duyệt kết quả xét nghiệm này
    REJECTED                // Bác sĩ từ chối kết quả xét nghiệm (yêu cầu thực hiện lại)
}
