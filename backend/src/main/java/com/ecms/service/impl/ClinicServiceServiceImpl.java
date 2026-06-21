package com.ecms.service.impl;

import com.ecms.dto.request.ServicePackageRequest;
import com.ecms.dto.request.ServiceRegistrationRequest;
import com.ecms.dto.response.ClinicServiceResponse;
import com.ecms.dto.response.ServiceCategoryResponse;
import com.ecms.dto.response.ServiceRegistrationResponse;
import com.ecms.entity.*;
import com.ecms.exception.ResourceNotFoundException;
import com.ecms.repository.*;
import com.ecms.service.ClinicServiceService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Comparator;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ClinicServiceServiceImpl implements ClinicServiceService {

    private final ClinicServiceRepository clinicServiceRepository;
    private final ServiceCategoryRepository serviceCategoryRepository;
    private final ServiceRegistrationRepository serviceRegistrationRepository;
    private final UserRepository userRepository;
    private final PatientRepository patientRepository;

    @Override
    @Transactional(readOnly = true)
    public List<ClinicServiceResponse> getAllServices(String type) {
        List<ClinicService> services = (type == null || type.isBlank())
                ? clinicServiceRepository.findByIsActiveTrueOrderByDisplayOrderAsc()
                : clinicServiceRepository.findByServiceTypeAndIsActiveTrueOrderByDisplayOrderAsc(type);
        return services.stream()
                .map(this::toServiceResponse)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public List<ServiceCategoryResponse> getCategoriesWithServices() {
        return serviceCategoryRepository.findAllByOrderByDisplayOrderAsc()
                .stream()
                .map(cat -> ServiceCategoryResponse.builder()
                        .id(cat.getId())
                        .name(cat.getName())
                        .slug(cat.getSlug())
                        .displayOrder(cat.getDisplayOrder())
                        .services(cat.getServices().stream()
                                .filter(s -> Boolean.TRUE.equals(s.getIsActive()))
                                .sorted(Comparator.comparingInt(s ->
                                        s.getDisplayOrder() == null ? 0 : s.getDisplayOrder()))
                                .map(this::toServiceResponse)
                                .collect(Collectors.toList()))
                        .build())
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public ClinicServiceResponse getServiceById(Long id) {
        ClinicService service = clinicServiceRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy dịch vụ với ID: " + id));
        return toServiceResponse(service);
    }

    @Override
    @Transactional
    public ServiceRegistrationResponse register(ServiceRegistrationRequest request, String currentUserEmail) {
        User currentUser = userRepository.findByEmail(currentUserEmail)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy người dùng"));

        ClinicService service = clinicServiceRepository.findById(request.getServiceId())
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy dịch vụ"));

        String roleName = currentUser.getRole().getName();
        Patient patient;

        if ("RECEPTIONIST".equals(roleName)) {
            if (request.getPatientId() == null) {
                throw new IllegalArgumentException("Lễ tân phải chỉ định bệnh nhân khi đăng ký dịch vụ");
            }
            patient = patientRepository.findById(request.getPatientId())
                    .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy bệnh nhân"));
        } else {
            patient = patientRepository.findByUser_Email(currentUserEmail)
                    .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy hồ sơ bệnh nhân"));
        }

        ServiceRegistration registration = ServiceRegistration.builder()
                .service(service)
                .patient(patient)
                .registeredBy(currentUser)
                .notes(request.getNotes())
                .build();

        return toRegistrationResponse(serviceRegistrationRepository.save(registration));
    }

    @Override
    @Transactional(readOnly = true)
    public List<ServiceRegistrationResponse> getAllRegistrations() {
        return serviceRegistrationRepository.findAllByOrderByCreatedAtDesc()
                .stream()
                .map(this::toRegistrationResponse)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public List<ServiceRegistrationResponse> getMyRegistrations(String currentUserEmail) {
        return serviceRegistrationRepository.findByPatient_User_EmailOrderByCreatedAtDesc(currentUserEmail)
                .stream()
                .map(this::toRegistrationResponse)
                .collect(Collectors.toList());
    }

    // ── Manager CRUD ───────────────────────────────────────────────

    @Override
    @Transactional
    public ClinicServiceResponse createPackage(ServicePackageRequest request) {
        ServiceCategory category = null;
        if (request.getCategoryId() != null) {
            category = serviceCategoryRepository.findById(request.getCategoryId())
                    .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy danh mục"));
        }
        ClinicService service = ClinicService.builder()
                .serviceName(request.getServiceName())
                .description(request.getDescription())
                .price(request.getPrice())
                .priceLabel(request.getPriceLabel())
                .durationMinutes(request.getDurationMinutes())
                .sessionsIncluded(request.getSessionsIncluded())
                .validityDays(request.getValidityDays())
                .category(category)
                .slug(request.getSlug())
                .thumbnailUrl(request.getThumbnailUrl())
                .content(request.getContent())
                .badge(request.getBadge())
                .isActive(request.getIsActive() != null ? request.getIsActive() : true)
                .displayOrder(request.getDisplayOrder() != null ? request.getDisplayOrder() : 0)
                .build();
        return toServiceResponse(clinicServiceRepository.save(service));
    }

    @Override
    @Transactional
    public ClinicServiceResponse updatePackage(Long id, ServicePackageRequest request) {
        ClinicService service = clinicServiceRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy gói dịch vụ"));
        ServiceCategory category = null;
        if (request.getCategoryId() != null) {
            category = serviceCategoryRepository.findById(request.getCategoryId())
                    .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy danh mục"));
        }
        service.setServiceName(request.getServiceName());
        service.setDescription(request.getDescription());
        service.setPrice(request.getPrice());
        service.setPriceLabel(request.getPriceLabel());
        service.setDurationMinutes(request.getDurationMinutes());
        service.setSessionsIncluded(request.getSessionsIncluded());
        service.setValidityDays(request.getValidityDays());
        service.setCategory(category);
        service.setSlug(request.getSlug());
        service.setThumbnailUrl(request.getThumbnailUrl());
        service.setContent(request.getContent());
        service.setBadge(request.getBadge());
        if (request.getIsActive() != null) service.setIsActive(request.getIsActive());
        if (request.getDisplayOrder() != null) service.setDisplayOrder(request.getDisplayOrder());
        return toServiceResponse(clinicServiceRepository.save(service));
    }

    @Override
    @Transactional
    public void deletePackage(Long id) {
        ClinicService service = clinicServiceRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy gói dịch vụ"));
        service.setIsActive(false);
        clinicServiceRepository.save(service);
    }

    @Override
    @Transactional
    public ClinicServiceResponse toggleActive(Long id) {
        ClinicService service = clinicServiceRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy gói dịch vụ"));
        service.setIsActive(!Boolean.TRUE.equals(service.getIsActive()));
        return toServiceResponse(clinicServiceRepository.save(service));
    }

    // ── Mappers ────────────────────────────────────────────────────

    private ClinicServiceResponse toServiceResponse(ClinicService s) {
        return ClinicServiceResponse.builder()
                .id(s.getId())
                .serviceName(s.getServiceName())
                .description(s.getDescription())
                .price(s.getPrice())
                .priceLabel(s.getPriceLabel())
                .durationMinutes(s.getDurationMinutes())
                .badge(s.getBadge())
                .thumbnailUrl(s.getThumbnailUrl())
                .content(s.getContent())
                .slug(s.getSlug())
                .sessionsIncluded(s.getSessionsIncluded())
                .validityDays(s.getValidityDays())
                .isActive(s.getIsActive())
                .displayOrder(s.getDisplayOrder())
                .categoryId(s.getCategory() != null ? s.getCategory().getId() : null)
                .categoryName(s.getCategory() != null ? s.getCategory().getName() : null)
                .serviceType(s.getServiceType())
                .createdAt(s.getCreatedAt())
                .build();
    }

    private ServiceRegistrationResponse toRegistrationResponse(ServiceRegistration r) {
        return ServiceRegistrationResponse.builder()
                .id(r.getId())
                .serviceId(r.getService().getId())
                .serviceName(r.getService().getServiceName())
                .patientId(r.getPatient().getId())
                .patientName(r.getPatient().getFullName())
                .registeredByName(r.getRegisteredBy().getFullName())
                .registeredByRole(r.getRegisteredBy().getRole().getName())
                .registrationDate(r.getRegistrationDate())
                .status(r.getStatus())
                .notes(r.getNotes())
                .createdAt(r.getCreatedAt())
                .build();
    }
}
