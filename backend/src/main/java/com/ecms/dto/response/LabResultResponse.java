
/**
 * Author: TuanTD
 * 
 * Đối tượng vận chuyển dữ liệu (DTO Response) chứa thông tin phản hồi chi tiết về kết quả xét nghiệm/đo khám mắt.
 * Kết hợp đầy đủ các chỉ số nhãn khoa nâng cao và thông tin định danh của bệnh nhân, bác sĩ, kỹ thuật viên phụ trách.
 */

package com.ecms.dto.response;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
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
public class LabResultResponse {

    /* ID định danh duy nhất của bản ghi kết quả xét nghiệm này */
    private Long id;

    /* ID của đơn xét nghiệm (LabOrder) tương ứng với kết quả này */
    private Long labOrderId;

    /* Thị lực mắt trái khi chưa điều chỉnh kính (Visual Acuity - Left) */
    private BigDecimal vaL;

    /* Thị lực mắt phải khi chưa điều chỉnh kính (Visual Acuity - Right) */
    private BigDecimal vaR;

    /*
     * Thị lực tối đa của mắt trái sau khi đã điều chỉnh kính tối ưu (Best Corrected
     * Visual Acuity - Left)
     */
    private BigDecimal bcvaL;

    /*
     * Thị lực tối đa của mắt phải sau khi đã điều chỉnh kính tối ưu (Best Corrected
     * Visual Acuity - Right)
     */
    private BigDecimal bcvaR;

    /*
     * Độ cầu mắt trái (Sphere - Left). Dấu (+) cho viễn thị, dấu (-) cho cận thị
     * (Đơn vị: Diopter)
     */
    private BigDecimal sphL;

    /* Độ loạn thị mắt trái (Cylinder - Left. Đơn vị: Diopter) */
    private BigDecimal cylL;

    /* Trục loạn thị mắt trái (Axis - Left). Đơn vị: Độ (°), giá trị từ 0 đến 180 */
    private Integer axisL;

    /* Nhãn áp mắt trái (Intraocular Pressure - Left). Đơn vị tính: mmHg */
    private BigDecimal iopL;

    /*
     * Độ cầu mắt phải (Sphere - Right). Dấu (+) cho viễn thị, dấu (-) cho cận thị
     * (Đơn vị: Diopter)
     */
    private BigDecimal sphR;

    /* Độ loạn thị mắt phải (Cylinder - Right. Đơn vị: Diopter) */
    private BigDecimal cylR;

    /*
     * Trục loạn thị mắt phải (Axis - Right). Đơn vị: Độ (°), giá trị từ 0 đến 180
     */
    private Integer axisR;

    /* Nhãn áp mắt phải (Intraocular Pressure - Right). Đơn vị tính: mmHg */
    private BigDecimal iopR;

    /*
     * Danh sách đường dẫn URL của các hình ảnh kết quả chụp chiếu, siêu âm mắt đi
     * kèm
     */
    private List<String> imageUrls;

    /* Ghi chú, kết luận hoặc nhận xét chuyên môn từ bác sĩ/kỹ thuật viên */
    private String doctorNotes;

    /* ID của hồ sơ bệnh án liên kết với đơn xét nghiệm */
    private Long medicalRecordId;

    /* ID của bác sĩ chỉ định */
    private Long doctorId;

    /* Họ và tên đầy đủ của bác sĩ chỉ định */
    private String doctorFullName;

    /* ID của kỹ thuật viên phòng xét nghiệm thực hiện đo khám */
    private Long labTechnicianId;

    /* Họ và tên đầy đủ của kỹ thuật viên thực hiện đo khám */
    private String labTechnicianFullName;

    /* ID của bệnh nhân */
    private Long patientId;

    /* Họ và tên đầy đủ của bệnh nhân */
    private String patientFullName;

    /* Thời điểm bác sĩ duyệt hoặc đánh giá lại kết quả xét nghiệm này */
    private LocalDateTime reviewedAt;

    /* Thời điểm kết quả xét nghiệm được khởi tạo trên hệ thống */
    private LocalDateTime createdAt;

    /*
     * Thời điểm cập nhật hoặc sửa đổi kết quả xét nghiệm gần nhất (nếu có bản nháp
     * hoặc chỉnh sửa)
     */
    private LocalDateTime updatedAt;
}