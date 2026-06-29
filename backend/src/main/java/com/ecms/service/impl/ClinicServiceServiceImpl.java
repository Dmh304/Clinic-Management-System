package com.ecms.service.impl;

import com.ecms.dto.request.ScheduleClinicVisitRequest;
import com.ecms.dto.request.ServicePackageRequest;
import com.ecms.dto.request.ServiceRegistrationRequest;
import com.ecms.dto.response.CareSessionResponse;
import com.ecms.dto.response.ClinicServiceResponse;
import com.ecms.dto.response.ServiceCategoryResponse;
import com.ecms.dto.response.ServiceRegistrationResponse;
import com.ecms.entity.*;
import com.ecms.exception.ConflictException;
import com.ecms.exception.ResourceNotFoundException;
import com.ecms.repository.*;
import com.ecms.service.CareSessionService;
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
        private final PatientServiceSubscriptionRepository subscriptionRepository;
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
                                                                .sorted(Comparator.comparingInt(
                                                                                s -> s.getDisplayOrder() == null ? 0
                                                                                                : s.getDisplayOrder()))
                                                                .map(this::toServiceResponse)
                                                                .collect(Collectors.toList()))
                                                .build())
                                .collect(Collectors.toList());
        }

        @Override
        @Transactional(readOnly = true)
        public ClinicServiceResponse getServiceById(Long id) {
                ClinicService service = clinicServiceRepository.findById(id)
                                .orElseThrow(() -> new ResourceNotFoundException(
                                                "KhÃ´ng tÃ¬m tháº¥y dá»‹ch vá»¥ vá»›i ID: " + id));
                return toServiceResponse(service);
        }

        @Override
        @Transactional
        public ServiceRegistrationResponse register(ServiceRegistrationRequest request, String currentUserEmail) {
                User currentUser = userRepository.findByEmail(currentUserEmail)
                                .orElseThrow(() -> new ResourceNotFoundException("KhÃ´ng tÃ¬m tháº¥y ngÆ°á»i dÃ¹ng"));

                ClinicService service = clinicServiceRepository.findById(request.getServiceId())
                                .orElseThrow(() -> new ResourceNotFoundException("KhÃ´ng tÃ¬m tháº¥y dá»‹ch vá»¥"));

                String roleName = currentUser.getRole().getName();
                Patient patient;

                if ("RECEPTIONIST".equals(roleName)) {
                        if (request.getPatientId() == null) {
                                throw new IllegalArgumentException(
                                                "Lá»… tÃ¢n pháº£i chá»‰ Ä‘á»‹nh bá»‡nh nhÃ¢n khi Ä‘Äƒng kÃ½ dá»‹ch vá»¥");
                        }
                        patient = patientRepository.findById(request.getPatientId())
                                        .orElseThrow(() -> new ResourceNotFoundException("KhÃ´ng tÃ¬m tháº¥y bá»‡nh nhÃ¢n"));
                } else {
                        patient = patientRepository.findByUser_Email(currentUserEmail)
                                        .orElseThrow(() -> new ResourceNotFoundException(
                                                        "KhÃ´ng tÃ¬m tháº¥y há»“ sÆ¡ bá»‡nh nhÃ¢n"));
                }

                // Cháº·n Ä‘Äƒng kÃ½ trÃ¹ng: náº¿u bá»‡nh nhÃ¢n Ä‘Ã£ cÃ³ Ä‘Äƒng kÃ½ dá»‹ch vá»¥ nÃ y Ä‘ang chá» tÆ° váº¥n
                if (serviceRegistrationRepository.existsByPatient_IdAndService_IdAndStatus(
                                patient.getId(), service.getId(), "PENDING")) {
                        throw new ConflictException(
                                        "Bá»‡nh nhÃ¢n Ä‘Ã£ Ä‘Äƒng kÃ½ dá»‹ch vá»¥ nÃ y vÃ  Ä‘ang chá» tÆ° váº¥n. Vui lÃ²ng chá» phÃ²ng khÃ¡m liÃªn há»‡.");
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
                                .orElseThrow(() -> new ResourceNotFoundException(
                                                "KhÃ´ng tÃ¬m tháº¥y Ä‘Äƒng kÃ½ dá»‹ch vá»¥: " + id));

                String normalized = status == null ? "" : status.trim().toUpperCase();
                if (!List.of("PENDING", "CONFIRMED", "COMPLETED", "CANCELLED").contains(normalized)) {
                        throw new IllegalArgumentException("Tráº¡ng thÃ¡i khÃ´ng há»£p lá»‡: " + status);
                }

                registration.setStatus(normalized);
                return toRegistrationResponse(serviceRegistrationRepository.save(registration));
        }

        // â”€â”€ Manager CRUD â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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
                                        .orElseThrow(() -> new ResourceNotFoundException("KhÃ´ng tÃ¬m tháº¥y danh má»¥c"));
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
                                .displayOrder(request.getDisplayOrder() != null ? request.getDisplayOrder() : 0)
                                .build();
                return toServiceResponse(clinicServiceRepository.save(service));
        }

        @Override
        @Transactional
        public ClinicServiceResponse updatePackage(Long id, ServicePackageRequest request) {
                ClinicService service = clinicServiceRepository.findById(id)
                                .orElseThrow(() -> new ResourceNotFoundException("KhÃ´ng tÃ¬m tháº¥y gÃ³i dá»‹ch vá»¥"));
                ServiceCategory category = null;
                if (request.getCategoryId() != null) {
                        category = serviceCategoryRepository.findById(request.getCategoryId())
                                        .orElseThrow(() -> new ResourceNotFoundException("KhÃ´ng tÃ¬m tháº¥y danh má»¥c"));
                }
                service.setServiceName(request.getServiceName());
                service.setDescription(request.getDescription());
                service.setPrice(request.getPrice());
                service.setPriceLabel(request.getPriceLabel());
                service.setDurationMinutes(request.getDurationMinutes());
                service.setSessionsIncluded(request.getSessionsIncluded());
                service.setValidityDays(request.getValidityDays());
                service.setCategory(category);
                if (request.getServiceType() != null)
                        service.setServiceType(request.getServiceType());
                service.setSlug(request.getSlug());
                service.setThumbnailUrl(request.getThumbnailUrl());
                service.setContent(request.getContent());
                service.setBadge(request.getBadge());
                if (request.getIsActive() != null)
                        service.setIsActive(request.getIsActive());
                if (request.getDisplayOrder() != null)
                        service.setDisplayOrder(request.getDisplayOrder());
                return toServiceResponse(clinicServiceRepository.save(service));
        }

        @Override
        @Transactional
        public void deletePackage(Long id) {
                ClinicService service = clinicServiceRepository.findById(id)
                                .orElseThrow(() -> new ResourceNotFoundException("KhÃ´ng tÃ¬m tháº¥y gÃ³i dá»‹ch vá»¥"));
                service.setIsActive(false);
                clinicServiceRepository.save(service);
        }

        @Override
        @Transactional
        public ClinicServiceResponse toggleActive(Long id) {
                ClinicService service = clinicServiceRepository.findById(id)
                                .orElseThrow(() -> new ResourceNotFoundException("KhÃ´ng tÃ¬m tháº¥y gÃ³i dá»‹ch vá»¥"));
                service.setIsActive(!Boolean.TRUE.equals(service.getIsActive()));
                return toServiceResponse(clinicServiceRepository.save(service));
        }

        // â”€â”€ Mappers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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
                                // Sá»‘ ngÆ°á»i Ä‘Äƒng kÃ½ gÃ³i â€” catalogue nhá» nÃªn N+1 cháº¥p nháº­n Ä‘Æ°á»£c
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

        
        @Override
        @org.springframework.transaction.annotation.Transactional
        public CareSessionResponse scheduleClinicVisit(Long registrationId, ScheduleClinicVisitRequest request,
                        String currentUserEmail) {
                // TODO: Implement the scheduling logic for clinic visits.
                throw new UnsupportedOperationException("Not implemented yet");
        }
}

