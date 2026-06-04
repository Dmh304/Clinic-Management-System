// Le Thi Bich Ngan - HE204710
// Interface định nghĩa các phương thức nghiệp vụ xử lý bệnh nhân.
// Triển khai cụ thể tại PatientServiceImpl.

package com.ecms.service;

import com.ecms.dto.request.PatientRequest;
import com.ecms.dto.response.PatientResponse;

import java.util.List;

public interface PatientService {

    // Tạo hồ sơ bệnh nhân vãng lai kèm tài khoản đăng nhập mặc định
    PatientResponse createWalkInPatient(PatientRequest request);

    // Tìm bệnh nhân theo tên hoặc số điện thoại; null/rỗng thì trả về toàn bộ
    List<PatientResponse> searchPatients(String keyword);
}
