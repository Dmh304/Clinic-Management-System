/**
 * Author: TuanTD
 * 
 * Đối tượng vận chuyển dữ liệu (DTO Response) chứa thông tin phản hồi chi tiết của một đơn xét nghiệm
 * Được sử dụng để trả về dữ liệu hiển thị trên giao diện người dùng cho bác sĩ, kỹ thuật viên hoặc quản trị viên
 */

package com.ecms.dto.response;

import java.time.LocalDateTime;
import com.ecms.entity.LabOrderStatus;
import com.ecms.entity.LabPriority;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class LabOrderResponse {

    /* ID định danh duy nhất của đơn xét nghiệm trong hệ thống */
    private Long id;

    /* ID của hồ sơ bệnh án đi kèm với đơn xét nghiệm này */
    private Long medicalRecordId;

    /* Họ và tên đầy đủ của bác sĩ chỉ định đơn xét nghiệm */
    private String doctorFullName;

    /* Họ và tên đầy đủ của kỹ thuật viên đảm nhận thực hiện xét nghiệm */
    private String labTechnicianFullName;

    /* Họ và tên đầy đủ của bệnh nhân */
    private String patientFullName;

    /* Số điện thoại liên hệ của bệnh nhân */
    private String patientPhone;

    /* Tên loại dịch vụ/danh mục xét nghiệm cần thực hiện */
    private String serviceName;

    /* Ghi chú hoặc chỉ dẫn đặc biệt từ bác sĩ chỉ định */
    private String notes;

    /* Mức độ ưu tiên của đơn xét nghiệm */
    private LabPriority priority;

    /* Trạng thái hiện tại của đơn xét nghiệm */
    private LabOrderStatus status;

    /* Lý do bác sĩ từ chối kết quả xét nghiệm và yêu cầu làm lại (nếu có) */
    private String rejectionReason;

    /* Thời điểm bác sĩ thực hiện từ chối kết quả xét nghiệm */
    private LocalDateTime rejectedAt;

    /* Thời điểm đơn xét nghiệm được tạo trên hệ thống */
    private LocalDateTime createdAt;

    /* Thời điểm đơn xét nghiệm hoàn thành và có kết quả chính thức */
    private LocalDateTime completedAt;

}