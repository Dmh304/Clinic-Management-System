package com.ecms.service.impl;

import com.ecms.dto.request.DiscountCampaignRequest;
import com.ecms.dto.response.DiscountApplicationResponse;
import com.ecms.dto.response.DiscountCampaignResponse;
import com.ecms.entity.DiscountCampaign;
import com.ecms.entity.User;
import com.ecms.exception.ResourceNotFoundException;
import com.ecms.repository.DiscountCampaignRepository;
import com.ecms.repository.UserRepository;
import com.ecms.service.AuditLogService;
import com.ecms.service.DiscountCampaignService;
import com.ecms.service.EmailService;
import com.ecms.service.NotificationService;
import com.ecms.util.UnsubscribeTokenUtil;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class DiscountCampaignServiceImpl implements DiscountCampaignService {

    private final DiscountCampaignRepository discountCampaignRepository;
    private final UserRepository userRepository;
    private final AuditLogService auditLogService;
    private final EmailService emailService;
    private final NotificationService notificationService;
    private final UnsubscribeTokenUtil unsubscribeTokenUtil;

    @Value("${app.frontend-base-url}")
    private String frontendBaseUrl;

    @Override
    @Transactional
    public DiscountCampaignResponse create(DiscountCampaignRequest request, String actorEmail, String ipAddress) {
        if ("VOUCHER".equals(request.getType()) && (request.getVoucherCode() == null || request.getVoucherCode().isBlank())) {
            throw new IllegalArgumentException("Mã voucher không được trống");
        }
        if (request.getValidTo().isBefore(request.getValidFrom())) {
            throw new IllegalArgumentException("Ngày kết thúc phải sau ngày bắt đầu");
        }
        DiscountCampaign campaign = DiscountCampaign.builder()
                .name(request.getName())
                .description(request.getDescription())
                .type(request.getType())
                .value(request.getValue())
                .voucherCode(request.getVoucherCode())
                .validFrom(request.getValidFrom())
                .validTo(request.getValidTo())
                .minPurchaseAmount(request.getMinPurchaseAmount())
                .maxUsageCount(request.getMaxUsageCount())
                .isActive(request.getIsActive() != null ? request.getIsActive() : true)
                .thumbnailUrl(request.getThumbnailUrl())
                .content(request.getContent())
                .build();
        DiscountCampaign saved = discountCampaignRepository.save(campaign);

        auditLogService.log(resolveActorId(actorEmail), "CREATE_DISCOUNT_CAMPAIGN", "DiscountCampaign",
                String.valueOf(saved.getId()), null, snapshot(saved), ipAddress);

        return toResponse(saved);
    }

    @Override
    @Transactional
    public DiscountCampaignResponse update(Long id, DiscountCampaignRequest request, String actorEmail, String ipAddress) {
        DiscountCampaign campaign = getOrThrow(id);
        if (request.getValidTo().isBefore(request.getValidFrom())) {
            throw new IllegalArgumentException("Ngày kết thúc phải sau ngày bắt đầu");
        }
        Map<String, Object> oldValue = snapshot(campaign);

        campaign.setName(request.getName());
        campaign.setDescription(request.getDescription());
        campaign.setType(request.getType());
        campaign.setValue(request.getValue());
        campaign.setVoucherCode(request.getVoucherCode());
        campaign.setValidFrom(request.getValidFrom());
        campaign.setValidTo(request.getValidTo());
        campaign.setMinPurchaseAmount(request.getMinPurchaseAmount());
        campaign.setMaxUsageCount(request.getMaxUsageCount());
        if (request.getIsActive() != null) campaign.setIsActive(request.getIsActive());
        campaign.setThumbnailUrl(request.getThumbnailUrl());
        campaign.setContent(request.getContent());
        DiscountCampaign saved = discountCampaignRepository.save(campaign);

        auditLogService.log(resolveActorId(actorEmail), "EDIT_DISCOUNT_CAMPAIGN", "DiscountCampaign",
                String.valueOf(saved.getId()), oldValue, snapshot(saved), ipAddress);

        return toResponse(saved);
    }

    @Override
    @Transactional
    public void delete(Long id, String actorEmail, String ipAddress) {
        DiscountCampaign campaign = getOrThrow(id);
        Map<String, Object> oldValue = snapshot(campaign);
        campaign.setIsActive(false);
        DiscountCampaign saved = discountCampaignRepository.save(campaign);

        auditLogService.log(resolveActorId(actorEmail), "DEACTIVATE_DISCOUNT_CAMPAIGN", "DiscountCampaign",
                String.valueOf(saved.getId()), oldValue, snapshot(saved), ipAddress);
    }

    @Override
    public DiscountCampaignResponse getById(Long id) {
        return toResponse(getOrThrow(id));
    }

    @Override
    public List<DiscountCampaignResponse> getAll() {
        return discountCampaignRepository.findAllByOrderByCreatedAtDesc()
                .stream().map(this::toResponse).collect(Collectors.toList());
    }

    @Override
    public List<DiscountCampaignResponse> getActive() {
        return discountCampaignRepository.findActiveCampaigns(LocalDate.now())
                .stream().map(this::toResponse).collect(Collectors.toList());
    }

    @Override
    public DiscountApplicationResponse quote(String voucherCode, BigDecimal amount) {
        DiscountCampaign discount = validateForApplication(voucherCode, amount);
        BigDecimal discountAmount = computeDiscountAmount(discount, amount);
        return DiscountApplicationResponse.builder()
                .campaignId(discount.getId())
                .campaignName(discount.getName())
                .discountAmount(discountAmount)
                .finalAmount(amount.subtract(discountAmount))
                .build();
    }

    @Override
    @Transactional
    public DiscountApplicationResponse redeemForOrder(String voucherCode, BigDecimal amount) {
        DiscountCampaign discount = validateForApplication(voucherCode, amount);
        BigDecimal discountAmount = computeDiscountAmount(discount, amount);

        discount.setUsedCount(discount.getUsedCount() + 1);
        BigDecimal prevGranted = discount.getTotalDiscountGranted() != null
                ? discount.getTotalDiscountGranted() : BigDecimal.ZERO;
        discount.setTotalDiscountGranted(prevGranted.add(discountAmount));
        discountCampaignRepository.save(discount);

        return DiscountApplicationResponse.builder()
                .campaignId(discount.getId())
                .campaignName(discount.getName())
                .discountAmount(discountAmount)
                .finalAmount(amount.subtract(discountAmount))
                .build();
    }

    @Override
    @Transactional
    public Map<String, Integer> broadcastAnnouncement(Long id, String actorEmail, String ipAddress) {
        DiscountCampaign campaign = getOrThrow(id);

        List<User> patients = userRepository.findByRole_Name("PATIENT").stream()
                .filter(u -> u.getEmail() != null && !u.getEmail().isBlank())
                .filter(u -> !Boolean.TRUE.equals(u.getMarketingOptOut()))
                .collect(Collectors.toList());

        String discountLabel = "PERCENTAGE".equals(campaign.getType())
                ? campaign.getValue().stripTrailingZeros().toPlainString() + "%"
                : campaign.getValue().longValue() + "đ";
        String detailUrl = frontendBaseUrl + "/promotions/" + campaign.getId();

        int sentCount = 0;
        for (User patient : patients) {
            try {
                String unsubscribeUrl = frontendBaseUrl + "/unsubscribe?uid=" + patient.getId()
                        + "&token=" + unsubscribeTokenUtil.generateToken(patient.getId());
                emailService.sendPromotionAnnouncement(patient.getEmail(), patient.getFullName(),
                        campaign.getName(), campaign.getDescription(), discountLabel, campaign.getValidTo(),
                        detailUrl, unsubscribeUrl);
                sentCount++;
            } catch (Exception e) {
                // Best-effort: 1 người gửi lỗi không được chặn những người còn lại.
                log.error("Lỗi gửi email khuyến mãi cho {}: {}", patient.getEmail(), e.getMessage());
            }
        }

        // Bắn kèm thông báo chuông trong app cho bệnh nhân đã đăng nhập — tận dụng hạ tầng
        // broadcast theo vai trò có sẵn (UC-13), không cần nút bấm riêng.
        notificationService.createForRole("PATIENT", "🎉 " + campaign.getName() + " — xem ngay!", null);

        auditLogService.log(resolveActorId(actorEmail), "BROADCAST_PROMOTION_EMAIL", "DiscountCampaign",
                String.valueOf(campaign.getId()), null,
                Map.of("sentCount", sentCount, "totalPatients", patients.size()), ipAddress);

        Map<String, Integer> result = new HashMap<>();
        result.put("sentCount", sentCount);
        result.put("totalPatients", patients.size());
        return result;
    }

    // ── Helpers dùng chung cho quote() và redeemForOrder() — tránh lặp lại logic
    // validate/tính toán giữa các luồng checkout (mua gói, xuất hoá đơn...). ──

    private DiscountCampaign validateForApplication(String voucherCode, BigDecimal amount) {
        DiscountCampaign discount = discountCampaignRepository.findByVoucherCode(voucherCode)
                .orElseThrow(() -> new ResourceNotFoundException("Mã giảm giá không hợp lệ"));

        LocalDate today = LocalDate.now();
        if (!discount.getIsActive() || today.isBefore(discount.getValidFrom()) || today.isAfter(discount.getValidTo())) {
            throw new IllegalArgumentException("Mã giảm giá đã hết hạn hoặc không còn hiệu lực");
        }
        if (discount.getMaxUsageCount() != null && discount.getUsedCount() >= discount.getMaxUsageCount()) {
            throw new IllegalArgumentException("Mã giảm giá đã hết lượt sử dụng");
        }
        if (discount.getMinPurchaseAmount() != null && amount.compareTo(discount.getMinPurchaseAmount()) < 0) {
            throw new IllegalArgumentException("Giá trị đơn hàng chưa đạt mức tối thiểu để áp dụng mã giảm giá");
        }
        return discount;
    }

    private BigDecimal computeDiscountAmount(DiscountCampaign discount, BigDecimal amount) {
        BigDecimal discountAmount;
        if ("PERCENTAGE".equals(discount.getType())) {
            discountAmount = amount.multiply(discount.getValue())
                    .divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP);
        } else {
            discountAmount = discount.getValue();
        }
        return discountAmount.min(amount).max(BigDecimal.ZERO);
    }

    private Long resolveActorId(String actorEmail) {
        if (actorEmail == null) return null;
        return userRepository.findByEmail(actorEmail).map(u -> u.getId()).orElse(null);
    }

    private Map<String, Object> snapshot(DiscountCampaign d) {
        Map<String, Object> map = new HashMap<>();
        map.put("name", d.getName());
        map.put("type", d.getType());
        map.put("value", d.getValue());
        map.put("voucherCode", d.getVoucherCode());
        map.put("validFrom", d.getValidFrom());
        map.put("validTo", d.getValidTo());
        map.put("maxUsageCount", d.getMaxUsageCount());
        map.put("isActive", d.getIsActive());
        return map;
    }

    private DiscountCampaign getOrThrow(Long id) {
        return discountCampaignRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy chương trình giảm giá"));
    }

    private DiscountCampaignResponse toResponse(DiscountCampaign d) {
        return DiscountCampaignResponse.builder()
                .id(d.getId())
                .name(d.getName())
                .description(d.getDescription())
                .type(d.getType())
                .value(d.getValue())
                .voucherCode(d.getVoucherCode())
                .validFrom(d.getValidFrom())
                .validTo(d.getValidTo())
                .minPurchaseAmount(d.getMinPurchaseAmount())
                .maxUsageCount(d.getMaxUsageCount())
                .usedCount(d.getUsedCount())
                .totalDiscountGranted(d.getTotalDiscountGranted())
                .isActive(d.getIsActive())
                .createdAt(d.getCreatedAt())
                .thumbnailUrl(d.getThumbnailUrl())
                .content(d.getContent())
                .build();
    }
}
