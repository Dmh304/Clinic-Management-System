package com.ecms.scheduler;

import com.ecms.service.AppointmentService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/**
 * Cron job tự động huỷ lịch hẹn no-show: khi sang ngày mới, các lịch hẹn của
 * những ngày đã qua mà bệnh nhân không đến khám (vẫn ở trạng thái PENDING /
 * CONFIRMED) sẽ được chuyển sang CANCELLED.
 *
 * Chạy mỗi ngày lúc 00:05 để dọn các lịch hẹn quá hạn của ngày hôm trước.
 *
 * (@EnableScheduling đã được bật sẵn ở BackendApplication.)
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class NoShowAppointmentScheduler {

    private final AppointmentService appointmentService;

    @Scheduled(cron = "0 5 0 * * *") // 00:05 mỗi ngày
    public void cancelNoShowAppointments() {
        try {
            int cancelled = appointmentService.autoCancelNoShowAppointments();
            log.info("Tự động huỷ no-show: đã huỷ {} lịch hẹn quá hạn", cancelled);
        } catch (Exception e) {
            log.error("Tự động huỷ no-show thất bại: {}", e.getMessage(), e);
        }
    }
}
