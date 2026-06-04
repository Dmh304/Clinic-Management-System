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

    private Long total;
    private Long pending;
    private Long confirmed;
    private Long waiting;
    private Long inProgress;
    private Long completed;
    private Long cancelled;
}