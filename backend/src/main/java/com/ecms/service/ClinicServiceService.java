package com.ecms.service;

import com.ecms.dto.request.ServicePackageRequest;
import com.ecms.dto.request.ServiceRegistrationRequest;
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

    // Manager CRUD
    ClinicServiceResponse createPackage(ServicePackageRequest request);
    ClinicServiceResponse updatePackage(Long id, ServicePackageRequest request);
    void deletePackage(Long id);
    ClinicServiceResponse toggleActive(Long id);
}
