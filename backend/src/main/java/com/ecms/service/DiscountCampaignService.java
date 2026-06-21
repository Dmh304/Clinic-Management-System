package com.ecms.service;

import com.ecms.dto.request.DiscountCampaignRequest;
import com.ecms.dto.response.DiscountCampaignResponse;

import java.util.List;

public interface DiscountCampaignService {

    DiscountCampaignResponse create(DiscountCampaignRequest request);

    DiscountCampaignResponse update(Long id, DiscountCampaignRequest request);

    void delete(Long id);

    DiscountCampaignResponse getById(Long id);

    List<DiscountCampaignResponse> getAll();

    List<DiscountCampaignResponse> getActive();
}
