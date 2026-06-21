package com.ecms.repository;

import com.ecms.entity.DiscountCampaign;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Repository
public interface DiscountCampaignRepository extends JpaRepository<DiscountCampaign, Long> {

    Optional<DiscountCampaign> findByVoucherCode(String voucherCode);

    @Query("SELECT d FROM DiscountCampaign d WHERE d.isActive = true AND d.validFrom <= :today AND d.validTo >= :today ORDER BY d.createdAt DESC")
    List<DiscountCampaign> findActiveCampaigns(@Param("today") LocalDate today);

    List<DiscountCampaign> findAllByOrderByCreatedAtDesc();
}
