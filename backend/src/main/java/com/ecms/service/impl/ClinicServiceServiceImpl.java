package com.ecms.service.impl;

import com.ecms.dto.request.BookCareSessionRequest;
import com.ecms.dto.request.PurchaseServiceRequest;
import com.ecms.dto.request.ScheduleClinicVisitRequest;
import com.ecms.dto.request.ServicePackageRequest;
import com.ecms.dto.request.ServiceRegistrationRequest;
import com.ecms.dto.response.CareSessionResponse;
import com.ecms.dto.response.ClinicServiceResponse;
import com.ecms.dto.response.ServiceCategoryResponse;
import com.ecms.dto.response.ServiceRegistrationResponse;
import com.ecms.dto.response.ServiceSubscriptionResponse;
import com.ecms.entity.*;
import com.ecms.exception.ConflictException;
import com.ecms.exception.ResourceNotFoundException;
import com.ecms.repository.*;
import com.ecms.service.CareSessionService;
import com.ecms.service.ClinicServiceService;
import com.ecms.service.ServiceSubscriptionService;
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
    private final PatientServiceSubscriptionRepository subscriptionRepository;
    private final ServiceSubscriptionService subscriptionService;
    private final CareSessionService careSessionService;

    @Override
    @Transactional(readOnly = true)
    public List<ClinicServiceResponse> getAllServices(String type) {
        List<ClinicService> services = (type == null || type.isBlank())
                ? clinicServiceRepository.findByIsActiveTrueOrderByIsPopularDescDisplayOrderAsc()
                : clinicServiceRepository.findByServiceTypeAndIsActiveTrueOrderByIsPopularDescDisplayOrderAsc(type);
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
                                .sorted(Comparator.<ClinicService, Boolean>comparing(s -> Boolean.TRUE.equals(s.getIsPopular())).reversed()
                                        .thenComparingInt(s -> s.getDisplayOrder() == null ? 0 : s.getDisplayOrder()))
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

        // Chặn đăng ký trùng: nếu bệnh nhân đã có đăng ký dịch vụ này đang chờ tư vấn
        if (serviceRegistrationRepository.existsByPatient_IdAndService_IdAndStatus(
                patient.getId(), service.getId(), "PENDING")) {
            throw new ConflictException(
                    "Bệnh nhân đã đăng ký dịch vụ này và đang chờ tư vấn. Vui lòng chờ phòng khám liên hệ.");
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

    @Override
    @Transactional
    public ServiceRegistrationResponse updateRegistrationStatus(Long id, String status) {
        ServiceRegistration registration = serviceRegistrationRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy đăng ký dịch vụ: " + id));

        String normalized = status == null ? "" : status.trim().toUpperCase();
        if (!List.of("PENDING", "CONFIRMED", "COMPLETED", "CANCELLED").contains(normalized)) {
            throw new IllegalArgumentException("Trạng thái không hợp lệ: " + status);
        }

        registration.setStatus(normalized);
        return toRegistrationResponse(serviceRegistrationRepository.save(registration));
    }

    @Override
    @Transactional
    public CareSessionResponse scheduleClinicVisit(Long registrationId, ScheduleClinicVisitRequest request,
            String currentUserEmail) {
        ServiceRegistration registration = serviceRegistrationRepository.findById(registrationId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy đăng ký dịch vụ: " + registrationId));

        if ("COMPLETED".equals(registration.getStatus()) || "CANCELLED".equals(registration.getStatus())) {
            throw new IllegalStateException("Đăng ký này đã được xử lý, không thể đặt buổi.");
        }

        // 1) Tạo gói (subscription) — lễ tân mua hộ bệnh nhân của đăng ký này
        PurchaseServiceRequest purchaseRequest = PurchaseServiceRequest.builder()
                .serviceId(registration.getService().getId())
                .patientId(registration.getPatient().getId())
                .notes(registration.getNotes())
                .build();
        ServiceSubscriptionResponse subscription = subscriptionService.purchase(purchaseRequest, currentUserEmail);

        // 2) Đặt buổi care-session đầu tiên vào thời điểm đã chọn (book() hỗ trợ lễ tân đặt hộ)
        BookCareSessionRequest bookRequest = BookCareSessionRequest.builder()
                .subscriptionId(subscription.getId())
                .scheduledDateTime(request.getScheduledDateTime())
                .notes(request.getNotes())
                .build();
        CareSessionResponse session = careSessionService.book(bookRequest, currentUserEmail);

        // 3) Đánh dấu đăng ký đã hoàn tất xử lý
        registration.setStatus("COMPLETED");
        serviceRegistrationRepository.save(registration);

        return session;
    }

    // ── Manager CRUD ───────────────────────────────────────────────

    @Override
    @Transactional(readOnly = true)
    public List<ClinicServiceResponse> getAllPackages() {
        return clinicServiceRepository.findAllByOrderByIsPopularDescDisplayOrderAsc()
                .stream()
                .map(this::toServiceResponse)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional
    public ClinicServiceResponse createPackage(ServicePackageRequest request) {
        ServiceCategory category = null;
        if (request.getCategoryId() != null) {
            category = serviceCategoryRepository.findById(request.getCategoryId())
                    .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy danh mục"));
        }
        Integer displayOrder = request.getDisplayOrder();
        if (displayOrder == null) {
            displayOrder = clinicServiceRepository.findMaxDisplayOrder().orElse(0) + 1;
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
                .serviceType(request.getServiceType() != null ? request.getServiceType() : "CARE")
                .slug(request.getSlug())
                .thumbnailUrl(request.getThumbnailUrl())
                .content(request.getContent())
                .badge(request.getBadge())
                .isActive(request.getIsActive() != null ? request.getIsActive() : true)
                .displayOrder(displayOrder)
                .isPopular(request.getIsPopular() != null ? request.getIsPopular() : false)
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
        if (request.getServiceType() != null) service.setServiceType(request.getServiceType());
        service.setSlug(request.getSlug());
        service.setThumbnailUrl(request.getThumbnailUrl());
        service.setContent(request.getContent());
        service.setBadge(request.getBadge());
        if (request.getIsActive() != null) service.setIsActive(request.getIsActive());
        if (request.getDisplayOrder() != null) service.setDisplayOrder(request.getDisplayOrder());
        if (request.getIsPopular() != null) service.setIsPopular(request.getIsPopular());
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
                .isPopular(s.getIsPopular())
                .categoryId(s.getCategory() != null ? s.getCategory().getId() : null)
                .categoryName(s.getCategory() != null ? s.getCategory().getName() : null)
                .serviceType(s.getServiceType())
                .createdAt(s.getCreatedAt())
                // Số người đăng ký gói — catalogue nhỏ nên N+1 chấp nhận được
                .subscriberCount(subscriptionRepository.countByService_Id(s.getId()))
                .build();
    }

    private ServiceRegistrationResponse toRegistrationResponse(ServiceRegistration r) {
        return ServiceRegistrationResponse.builder()
                .id(r.getId())
                .serviceId(r.getService().getId())
                .serviceName(r.getService().getServiceName())
                .patientId(r.getPatient().getId())
                .patientName(r.getPatient().getFullName())
                .patientPhone(r.getPatient().getPhone())
                .patientEmail(r.getPatient().getEmail())
                .registeredByName(r.getRegisteredBy().getFullName())
                .registeredByRole(r.getRegisteredBy().getRole().getName())
                .registrationDate(r.getRegistrationDate())
                .status(r.getStatus())
                .notes(r.getNotes())
                .createdAt(r.getCreatedAt())
                .build();
    }
}
