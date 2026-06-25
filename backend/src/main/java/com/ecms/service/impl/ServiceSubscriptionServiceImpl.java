package com.ecms.service.impl;

import com.ecms.dto.request.PurchaseServiceRequest;
import com.ecms.dto.response.DiscountCampaignResponse;
import com.ecms.dto.response.ServiceSubscriptionResponse;
import com.ecms.entity.*;
import com.ecms.exception.ResourceNotFoundException;
import com.ecms.repository.*;
import com.ecms.service.ServiceSubscriptionService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ServiceSubscriptionServiceImpl implements ServiceSubscriptionService {

    private final PatientServiceSubscriptionRepository subscriptionRepository;
    private final ClinicServiceRepository serviceRepository;
    private final PatientRepository patientRepository;
    private final UserRepository userRepository;
    private final DiscountCampaignRepository discountCampaignRepository;

    @Override
    @Transactional
    public ServiceSubscriptionResponse purchase(PurchaseServiceRequest request, String currentUserEmail) {
        User currentUser = userRepository.findByEmail(currentUserEmail)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy người dùng"));

        ClinicService service = serviceRepository.findById(request.getServiceId())
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy gói dịch vụ"));

        if (service.getSessionsIncluded() == null || service.getSessionsIncluded() < 1) {
            throw new IllegalArgumentException("Gói dịch vụ này không hỗ trợ đăng ký theo buổi");
        }

        Patient patient;
        String roleName = currentUser.getRole().getName();
        if ("RECEPTIONIST".equals(roleName) || "MANAGER".equals(roleName)) {
            if (request.getPatientId() == null) {
                throw new IllegalArgumentException("Vui lòng chỉ định bệnh nhân");
            }
            patient = patientRepository.findById(request.getPatientId())
                    .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy bệnh nhân"));
        } else {
            patient = patientRepository.findByUser_Email(currentUserEmail)
                    .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy hồ sơ bệnh nhân"));
        }

        BigDecimal finalPrice = service.getPrice() != null ? service.getPrice() : BigDecimal.ZERO;
        DiscountCampaign discount = null;

        if (request.getDiscountCode() != null && !request.getDiscountCode().isBlank()) {
            discount = discountCampaignRepository.findByVoucherCode(request.getDiscountCode())
                    .orElseThrow(() -> new ResourceNotFoundException("Mã giảm giá không hợp lệ"));

            LocalDate today = LocalDate.now();
            if (!discount.getIsActive() || today.isBefore(discount.getValidFrom()) || today.isAfter(discount.getValidTo())) {
                throw new IllegalArgumentException("Mã giảm giá đã hết hạn hoặc không còn hiệu lực");
            }
            if (discount.getMaxUsageCount() != null && discount.getUsedCount() >= discount.getMaxUsageCount()) {
                throw new IllegalArgumentException("Mã giảm giá đã hết lượt sử dụng");
            }
            if (discount.getMinPurchaseAmount() != null && finalPrice.compareTo(discount.getMinPurchaseAmount()) < 0) {
                throw new IllegalArgumentException("Giá trị đơn hàng chưa đạt mức tối thiểu để áp dụng mã giảm giá");
            }

            if ("PERCENTAGE".equals(discount.getType())) {
                BigDecimal discountAmount = finalPrice.multiply(discount.getValue()).divide(BigDecimal.valueOf(100));
                finalPrice = finalPrice.subtract(discountAmount);
            } else {
                finalPrice = finalPrice.subtract(discount.getValue()).max(BigDecimal.ZERO);
            }

            discount.setUsedCount(discount.getUsedCount() + 1);
            discountCampaignRepository.save(discount);
        }

        LocalDate expiryDate = service.getValidityDays() != null
                ? LocalDate.now().plusDays(service.getValidityDays())
                : null;

        PatientServiceSubscription subscription = PatientServiceSubscription.builder()
                .patient(patient)
                .service(service)
                .totalSessions(service.getSessionsIncluded())
                .usedSessions(0)
                .expiryDate(expiryDate)
                .discount(discount)
                .finalPrice(finalPrice)
                .notes(request.getNotes())
                .build();

        return toResponse(subscriptionRepository.save(subscription));
    }

    @Override
    public List<ServiceSubscriptionResponse> getMySubscriptions(String currentUserEmail) {
        return subscriptionRepository.findByPatient_User_EmailOrderByCreatedAtDesc(currentUserEmail)
                .stream().map(this::toResponse).collect(Collectors.toList());
    }

    @Override
    public ServiceSubscriptionResponse getById(Long id) {
        return toResponse(subscriptionRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy đăng ký")));
    }

    @Override
    public List<ServiceSubscriptionResponse> getAllSubscriptions() {
        return subscriptionRepository.findAllByOrderByCreatedAtDesc()
                .stream().map(this::toResponse).collect(Collectors.toList());
    }

    @Override
    public List<ServiceSubscriptionResponse> getSubscriptionsByPatient(Long patientId) {
        return subscriptionRepository.findByPatient_IdOrderByCreatedAtDesc(patientId)
                .stream().map(this::toResponse).collect(Collectors.toList());
    }

    @Override
    @Transactional
    public void cancelSubscription(Long id, String currentUserEmail) {
        PatientServiceSubscription sub = subscriptionRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy đăng ký"));

        if ("CANCELLED".equals(sub.getStatus())) {
            throw new IllegalStateException("Đăng ký này đã bị huỷ");
        }
        if (sub.getUsedSessions() > 0) {
            throw new IllegalStateException("Không thể huỷ gói đã sử dụng buổi khám");
        }

        sub.setStatus("CANCELLED");
        subscriptionRepository.save(sub);
    }

    @Override
    public DiscountCampaignResponse validateDiscountCode(String code, BigDecimal amount) {
        DiscountCampaign discount = discountCampaignRepository.findByVoucherCode(code)
                .orElseThrow(() -> new ResourceNotFoundException("Mã giảm giá không tồn tại"));

        LocalDate today = LocalDate.now();
        if (!discount.getIsActive() || today.isBefore(discount.getValidFrom()) || today.isAfter(discount.getValidTo())) {
            throw new IllegalArgumentException("Mã giảm giá đã hết hạn");
        }
        if (discount.getMaxUsageCount() != null && discount.getUsedCount() >= discount.getMaxUsageCount()) {
            throw new IllegalArgumentException("Mã giảm giá đã hết lượt sử dụng");
        }
        if (amount != null && discount.getMinPurchaseAmount() != null && amount.compareTo(discount.getMinPurchaseAmount()) < 0) {
            throw new IllegalArgumentException("Giá trị đơn hàng chưa đủ điều kiện");
        }

        return toDiscountResponse(discount);
    }

    private ServiceSubscriptionResponse toResponse(PatientServiceSubscription s) {
        return ServiceSubscriptionResponse.builder()
                .id(s.getId())
                .patientId(s.getPatient().getId())
                .patientName(s.getPatient().getFullName())
                .patientCode(s.getPatient().getPatientCode())
                .serviceId(s.getService().getId())
                .serviceName(s.getService().getServiceName())
                .totalSessions(s.getTotalSessions())
                .usedSessions(s.getUsedSessions())
                .remainingSessions(s.getRemainingSessions())
                .purchaseDate(s.getPurchaseDate())
                .expiryDate(s.getExpiryDate())
                .status(s.getStatus())
                .finalPrice(s.getFinalPrice())
                .discountId(s.getDiscount() != null ? s.getDiscount().getId() : null)
                .discountName(s.getDiscount() != null ? s.getDiscount().getName() : null)
                .notes(s.getNotes())
                .createdAt(s.getCreatedAt())
                .build();
    }

    private DiscountCampaignResponse toDiscountResponse(DiscountCampaign d) {
        return DiscountCampaignResponse.builder()
                .id(d.getId())
                .name(d.getName())
                .type(d.getType())
                .value(d.getValue())
                .voucherCode(d.getVoucherCode())
                .validFrom(d.getValidFrom())
                .validTo(d.getValidTo())
                .build();
    }
}
