/** 
 * Author: Tuấn - HE204215
 * 
 * Interface định nghĩa các nghiệp vụ liên quan đến quản lý Hồ sơ bệnh án điện tử (EMR).
*/
package com.ecms.service;

import com.ecms.dto.request.EMRRequest;
import com.ecms.dto.response.EMRResponse;

import java.util.List;

public interface EMRService {

    // Lưu thông tin hồ sơ bệnh án (tạo mới hoặc cập nhật bệnh án hiện có)
    EMRResponse saveEMR(EMRRequest request);

    EMRResponse getById(Long id);

    // Lấy chi tiết hồ sơ bệnh án thông qua ID của lịch hẹn
    EMRResponse getByAppointmentId(Long appointmentId);

    // Lấy danh sách lịch sử khám bệnh của một bệnh nhân cụ thể
    List<EMRResponse> getPatientHistory(Long patientId);

    // Lấy danh sách tất cả lịch sử bệnh án đã hoàn thành
    List<EMRResponse> getCompletedList(Long doctorId);

    // Lấy toàn bộ hồ sơ bệnh án trong hệ thống (mọi trạng thái)
    List<EMRResponse> getAllList();
}
