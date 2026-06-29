package com.ecms.service;

import com.ecms.dto.request.ScheduleClinicVisitRequest;
import com.ecms.dto.request.ServicePackageRequest;
import com.ecms.dto.request.ServiceRegistrationRequest;
import com.ecms.dto.response.CareSessionResponse;
import com.ecms.dto.response.ClinicServiceResponse;
import com.ecms.dto.response.ServiceCategoryResponse;
import com.ecms.dto.response.ServiceRegistrationResponse;

import java.util.List;

public interface ClinicServiceService {
    List<ClinicServiceResponse> getAllServices(String type);
    List<ServiceCategoryResponse> getCategoriesWithServices();
    ClinicServiceResponse getServiceById(Long id);
    ServiceRegistrationResponse register(ServiceRegistrationRequest request, String currentUserEmail);
    List<ServiceRegistrationResponse> getAllRegistrations();
    List<ServiceRegistrationResponse> getMyRegistrations(String currentUserEmail);
    // Lễ tân cập nhật trạng thái đăng ký (vd: đã liên hệ tư vấn -> CONFIRMED)
    ServiceRegistrationResponse updateRegistrationStatus(Long id, String status);

    /**
     * Lễ tân đặt buổi đến phòng khám cho một đăng ký dịch vụ đã được khách đồng ý:
     * tạo gói (subscription) + buổi care-session đầu tiên, đánh dấu đăng ký COMPLETED.
     */
    CareSessionResponse scheduleClinicVisit(Long registrationId, ScheduleClinicVisitRequest request,
            String currentUserEmail);

    // Manager CRUD
    List<ClinicServiceResponse> getAllPackages(); // tất cả gói kể cả đã ẩn
    ClinicServiceResponse createPackage(ServicePackageRequest request);
    ClinicServiceResponse updatePackage(Long id, ServicePackageRequest request);
    void deletePackage(Long id);
    ClinicServiceResponse toggleActive(Long id);
}
