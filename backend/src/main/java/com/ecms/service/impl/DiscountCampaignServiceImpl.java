package com.ecms.service.impl;

import com.ecms.dto.request.DiscountCampaignRequest;
import com.ecms.dto.response.DiscountCampaignResponse;
import com.ecms.entity.DiscountCampaign;
import com.ecms.exception.ResourceNotFoundException;
import com.ecms.repository.DiscountCampaignRepository;
import com.ecms.service.DiscountCampaignService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class DiscountCampaignServiceImpl implements DiscountCampaignService {

    private final DiscountCampaignRepository discountCampaignRepository;

    @Override
    @Transactional
    public DiscountCampaignResponse create(DiscountCampaignRequest request) {
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
                .build();
        return toResponse(discountCampaignRepository.save(campaign));
    }

    @Override
    @Transactional
    public DiscountCampaignResponse update(Long id, DiscountCampaignRequest request) {
        DiscountCampaign campaign = getOrThrow(id);
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
        return toResponse(discountCampaignRepository.save(campaign));
    }

    @Override
    @Transactional
    public void delete(Long id) {
        DiscountCampaign campaign = getOrThrow(id);
        campaign.setIsActive(false);
        discountCampaignRepository.save(campaign);
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
                .isActive(d.getIsActive())
                .createdAt(d.getCreatedAt())
                .build();
    }
}
