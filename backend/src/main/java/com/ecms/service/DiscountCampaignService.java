package com.ecms.service;

import com.ecms.dto.request.DiscountCampaignRequest;
import com.ecms.dto.response.DiscountApplicationResponse;
import com.ecms.dto.response.DiscountCampaignResponse;

import java.math.BigDecimal;
import java.util.List;

public interface DiscountCampaignService {

    DiscountCampaignResponse create(DiscountCampaignRequest request, String actorEmail, String ipAddress);

    DiscountCampaignResponse update(Long id, DiscountCampaignRequest request, String actorEmail, String ipAddress);

    void delete(Long id, String actorEmail, String ipAddress);

    DiscountCampaignResponse getById(Long id);

    List<DiscountCampaignResponse> getAll();

    List<DiscountCampaignResponse> getActive();

    /** Trang khuyến mãi công khai: mọi campaign kể cả đã hết hạn/sắp diễn ra — khác getActive()
     *  (chỉ campaign đang áp dụng được) và getAll() (yêu cầu quyền nhân viên). */
    List<DiscountCampaignResponse> getAllPublic();

    /** Xem trước mức giảm của 1 mã cho 1 số tiền — KHÔNG tăng lượt dùng (dùng để hiển thị trước khi xác nhận). */
    DiscountApplicationResponse quote(String voucherCode, BigDecimal amount);

    /** Áp dụng thật: xác thực lại rồi tăng lượt dùng + luỹ kế số tiền đã giảm — dùng khi đơn hàng
     *  thực sự được tạo (mua gói dịch vụ, xuất hoá đơn...). */
    DiscountApplicationResponse redeemForOrder(String voucherCode, BigDecimal amount);

    /** Manager bấm gửi thủ công — broadcast email + thông báo trong app cho toàn bộ bệnh nhân
     *  có email trong hệ thống. Trả về số lượng email đã gửi thành công / tổng số bệnh nhân có email. */
    java.util.Map<String, Integer> broadcastAnnouncement(Long id, String actorEmail, String ipAddress);
}
