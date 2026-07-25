package com.ecms.scheduler;

import com.ecms.dto.response.AutoAssignResult;
import com.ecms.service.CareSessionService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.LocalDate;

/**
 * UC-19 ALT-1: lưới an toàn tự động phân công điều dưỡng cho các buổi dịch vụ
 * (CareSession) còn "Chưa phân công".
 *
 * Trước job này, một buổi chỉ có nurse nếu: (1) pickAvailableNurse() thành công lúc
 * đặt lịch (best-effort, hay thất bại nếu điều dưỡng chưa được xếp phòng trực ngày
 * đó), hoặc (2) Manager tự tay vào AssignNursePage bấm "Phân công"/"Tự động phân
 * công". Nếu Manager quên hoặc không có mặt, buổi "Chưa phân công" treo vô thời hạn —
 * kể cả khi bệnh nhân đã check-in tại quầy — vì không điều dưỡng nào tự nhìn thấy
 * buổi chưa gán trong hàng đợi của họ (getNurseQueue chỉ lọc theo nurse_id).
 *
 * Job này quét định kỳ trong giờ làm việc, gọi lại đúng logic autoAssignRemaining()
 * đã có (không đổi rule phân công, chỉ tự động hoá việc bấm nút) để buổi luôn có
 * người nhận trong vòng tối đa 30 phút mà không cần ai chủ động thao tác.
 *
 * (@EnableScheduling đã được bật sẵn ở BackendApplication.)
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class CareSessionAutoAssignScheduler {

    private final CareSessionService careSessionService;

    // Mỗi 30 phút trong giờ làm việc (07:00–17:30) — đủ sớm để bắt kịp buổi vừa check-in.
    @Scheduled(cron = "0 0/30 7-17 * * *")
    public void autoAssignToday() {
        try {
            AutoAssignResult result = careSessionService.autoAssignRemaining(LocalDate.now(), null, null);
            if (result.getAssignedCount() > 0 || result.getStillUnassignedCount() > 0) {
                log.info("Tự động phân công điều dưỡng định kỳ: đã gán {} buổi, còn {} buổi chưa gán được (thiếu điều dưỡng rảnh)",
                        result.getAssignedCount(), result.getStillUnassignedCount());
            }
        } catch (Exception e) {
            log.error("Tự động phân công điều dưỡng định kỳ thất bại: {}", e.getMessage(), e);
        }
    }
}
