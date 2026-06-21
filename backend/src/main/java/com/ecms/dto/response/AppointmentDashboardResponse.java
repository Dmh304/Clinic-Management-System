/**
 * Author: Tuấn - HE204215
 * 
 * Đối tượng chuyển đổi dữ liệu (DTO) phản hồi thông tin thống kê lịch hẹn trên dashboard
 * Tổng hợp số lượng lịch hẹn theo từng trạng thái cụ thể để hiển thị
 */
// Le Thi Bich Ngan - HE204710
// DTO trả về số liệu thống kê lịch hẹn trong ngày cho trang Reception Dashboard.
// Gồm tổng số lịch và số lượng theo từng trạng thái:
// pending (chờ xác nhận), confirmed (đã xác nhận), waiting (chờ khám),
// inProgress (đang khám), completed (hoàn thành), cancelled (đã hủy).

package com.ecms.dto.response;

import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AppointmentDashboardResponse {

    /* Tổng số lượng tất cả các lịch hẹn trong ngày */
    private Long total;

    /* Số lượng lịch hẹn đang ở trạng thái chờ xác nhận */
    private Long pending;

    /* Số lượng lịch hẹn đã được xác nhận thành công */
    private Long confirmed;

    /* Số lượng bệnh nhân đã check-in và đang xếp hàng chờ vào khám */
    private Long waiting;

    /* Số lượng bệnh nhân hiện đang được khám */
    private Long inProgress;

    /* Số lượng lịch hẹn đã hoàn thành quy trình khám và lập bệnh án */
    private Long completed;

    /* Số lượng lịch hẹn bị hủy */
    private Long cancelled;
}