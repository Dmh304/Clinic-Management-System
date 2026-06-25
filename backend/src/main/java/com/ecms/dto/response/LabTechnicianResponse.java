/**
 * Author: TuanTD
 * 
 * Đối tượng vận chuyển dữ liệu (DTO Response) chứa thông tin phản hồi cơ bản của một kỹ thuật viên
 * Dùng để hiển thị danh sách thu gọn phục vụ cho việc điều phối hoặc chọn người thực hiện đơn xét nghiệm
 */

package com.ecms.dto.response;

import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class LabTechnicianResponse {

    /* ID định danh duy nhất của kỹ thuật viên trong hệ thống */
    private Long id;

    /* Họ và tên đầy đủ của kỹ thuật viên */
    private String fullName;

    /* Chuyên môn của kỹ thuật viên phòng xét nghiệm */
    private String specialization;

    /* Địa chỉ email liên hệ của kỹ thuật viên */
    private String email;
}