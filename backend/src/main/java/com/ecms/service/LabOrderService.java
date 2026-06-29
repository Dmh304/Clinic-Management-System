/**
 * Author: TuanTD
 * 
 * Interface quản lý các nghiệp vụ liên quan đến đơn xét nghiệm (Lab Order)
 * Định nghĩa các thao tác từ lúc bác sĩ tạo đơn, kỹ thuật viên tiếp nhận, xử lý, cho đến khi phê duyệt kết quả.
 */

package com.ecms.service;

import java.util.List;

import com.ecms.dto.request.LabOrderRequest;
import com.ecms.dto.request.LabResultRequest;
import com.ecms.dto.response.LabOrderResponse;
import com.ecms.dto.response.LabResultResponse;
import com.ecms.dto.response.LabTechnicianResponse;

public interface LabOrderService {

    /**
     * Tạo mới một đơn yêu cầu xét nghiệm cho bệnh nhân
     */
    LabOrderResponse createLabOrder(LabOrderRequest request, Long doctorId);

    /**
     * Lấy danh sách hàng đợi các đơn xét nghiệm cần xử lý của một kỹ thuật viên cụ
     * thể
     */
    List<LabOrderResponse> getLabQueue(Long labTechnicianId);

    /**
     * Gửi kết quả xét nghiệm chính thức sau khi đã hoàn thành phân tích
     * Trạng thái đơn sẽ chuyển sang dạng chờ bác sĩ phê duyệt
     */
    LabOrderResponse submitLabResult(Long labOrderId, LabResultRequest request, Long labTechnicianId);

    /**
     * Lấy danh sách tất cả các đơn xét nghiệm thuộc về một hồ sơ bệnh án cụ thể
     */
    List<LabOrderResponse> getLabOrdersForMedicalRecord(Long medicalRecordId);

    /**
     * Xem chi tiết kết quả xét nghiệm dựa trên quyền hạn và vai trò của người dùng
     * hiện tại
     */
    LabResultResponse getLabResults(Long labOrderId, Long currentUserId, String currentUserRole);

    /**
     * Bác sĩ thực hiện phê duyệt/chấp nhận kết quả xét nghiệm do kỹ thuật viên gửi
     * lên
     */
    LabOrderResponse approveLabResult(Long labOrderId, Long doctorId);

    /**
     * Bác sĩ từ chối kết quả hiện tại và yêu cầu kỹ thuật viên thực hiện xét nghiệm
     * lại (Retest)
     */
    LabOrderResponse requestRetest(Long labOrderId, Long doctorId, LabOrderRequest request);

    /**
     * Kỹ thuật viên tiếp nhận và bắt đầu tiến hành thực hiện đơn xét nghiệm
     * Trạng thái đơn sẽ chuyển sang "Đang tiến hành" (IN_PROGRESS)
     */
    LabOrderResponse startLabOrder(Long labOrderId, Long labTechnicianId);

    /**
     * Lấy danh sách tất cả các kỹ thuật viên phòng xét nghiệm đang trong trạng thái
     * hoạt động (Active)
     * Dùng để bác sĩ hoặc hệ thống điều phối, chỉ định người thực hiện
     */
    List<LabTechnicianResponse> getActiveLabTechnicians();

    /**
     * Lấy danh sách tất cả các đơn xét nghiệm do một bác sĩ cụ thể chỉ định
     */
    List<LabOrderResponse> getLabOrdersForDoctor(Long doctorId);

    /**
     * Lưu tạm thời (bản nháp) kết quả xét nghiệm trong quá trình làm việc mà chưa
     * nộp chính thức
     * Giúp kỹ thuật viên có thể quay lại chỉnh sửa tiếp mà không bị mất dữ liệu
     */
    LabOrderResponse saveDraft(Long labOrderId, LabResultRequest request, Long labTechnicianId);
}