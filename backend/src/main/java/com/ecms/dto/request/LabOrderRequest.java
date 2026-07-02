/**
 * Author: TuanTD
 * 
 * Đối tượng vận chuyển dữ liệu (DTO Request) chứa thông tin yêu cầu tạo mới,
 * cập nhật hoặc thay đổi trạng thái của một đơn xét nghiệm (Lab Order)
 */

package com.ecms.dto.request;

import java.time.LocalDateTime;
import com.ecms.entity.LabOrderStatus;
import com.ecms.entity.LabPriority;
import lombok.Data;

@Data
public class LabOrderRequest {

    /* ID của hồ sơ bệnh án gắn liền với đơn xét nghiệm này */
    private Long medicalRecordId;

    /* ID của bác sĩ đưa ra chỉ định hoặc thực hiện chỉnh sửa đơn xét nghiệm */
    private Long doctorId;

    /* ID của bệnh nhân được chỉ định thực hiện xét nghiệm */
    private Long patientId;

    /* ID của kỹ thuật viên phòng xét nghiệm được phân công xử lý đơn này */
    private Long labTechnicianId;

    /* Ghi chú hoặc yêu cầu, chỉ dẫn đặc biệt từ bác sĩ chỉ định */
    private String notes;

    /*
     * Lý do từ chối hoặc yêu cầu làm lại kết quả xét nghiệm (nếu có từ phía bác sĩ)
     */
    private String rejectionReason;

    /* Thời điểm bác sĩ thực hiện từ chối kết quả xét nghiệm */
    private LocalDateTime rejectedAt;

    /* Mức độ ưu tiên của đơn xét nghiệm */
    private LabPriority priority;

    /* Trạng thái mong muốn hoặc trạng thái cập nhật của đơn xét nghiệm */
    private LabOrderStatus status;

}