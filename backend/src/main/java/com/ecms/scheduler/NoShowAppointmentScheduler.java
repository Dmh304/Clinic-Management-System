package com.ecms.scheduler;

import com.ecms.service.AppointmentService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/**
 * Cron job tự động huỷ lịch hẹn no-show — chạy 2 mốc trong ngày:
 *
 * 1) 17:05 (ngay sau giờ đóng cửa 17:00): huỷ các lịch hẹn HÔM NAY còn
 * PENDING/CONFIRMED (bệnh nhân chưa check-in) — đúng yêu cầu "quá giờ
 * đóng cửa mà chưa đến thì huỷ luôn trong ngày", không phải đợi qua đêm.
 * 2) 00:05 (sang ngày mới): lưới an toàn dọn nốt mọi lịch hẹn còn sót của
 * ngày hôm trước, kể cả WAITING/IN_PROGRESS bị bỏ dở (ca khám không được
 * đóng đúng cách).
 *
 * (@EnableScheduling đã được bật sẵn ở BackendApplication.)
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class NoShowAppointmentScheduler {

    private final AppointmentService appointmentService;

    // Job mới: huỷ PENDING/CONFIRMED trễ giờ khám quá 30 phút — chạy mỗi 5 phút
    // để không phải đợi tới 17:05/00:05 như 2 cron dưới đây mới được dọn.
    @Scheduled(cron = "0 */5 * * * *")
    public void cancelOverdue30MinAppointments() {
        try {
            int cancelled = appointmentService.autoCancelOverdue30MinAppointments();
            if (cancelled > 0) {
                log.info("Tự động huỷ trễ hẹn 30 phút: đã huỷ {} lịch hẹn", cancelled);
            }
        } catch (Exception e) {
            log.error("Tự động huỷ trễ hẹn 30 phút thất bại: {}", e.getMessage(), e);
        }
    }

    // Le Thi Bich Ngan - HE204710 | Tạo: 18/07/2026
    // Chức năng: cron mới huỷ no-show ngay khi phòng khám đóng cửa (không gắn
    // BR số cụ thể) — bổ sung bên cạnh cron 00:05 sẵn có, tránh lịch PENDING/
    // CONFIRMED của hôm nay phải treo tới nửa đêm mới được dọn.
    @Scheduled(cron = "0 5 17 * * *") // 17:05 mỗi ngày — ngay sau giờ đóng cửa
    public void cancelOverdueTodayAppointments() {
        try {
            int cancelled = appointmentService.autoCancelOverdueTodayAppointments();
            log.info("Tự động huỷ no-show (đóng cửa): đã huỷ {} lịch hẹn quá giờ hôm nay", cancelled);
        } catch (Exception e) {
            log.error("Tự động huỷ no-show (đóng cửa) thất bại: {}", e.getMessage(), e);
        }
    }

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
