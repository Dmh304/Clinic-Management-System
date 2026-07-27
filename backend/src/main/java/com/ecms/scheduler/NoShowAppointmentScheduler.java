package com.ecms.scheduler;

import com.ecms.service.AppointmentService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/**
 * Cron job tự động huỷ lịch hẹn no-show:
 *
 * 1) Mỗi 5 phút trong giờ làm việc (07:00–17:59): huỷ ngay các lịch hẹn HÔM NAY
 * đã quá giờ hẹn mà vẫn còn PENDING/CONFIRMED (bệnh nhân chưa check-in) —
 * trễ giờ là huỷ ngay ở lần quét kế tiếp (tối đa lệch 5 phút), không cần chờ
 * tới cuối ngày. Bệnh nhân đến muộn muốn khám thì lễ tân tạo lịch khám vãng
 * lai (walk-in) mới, không dùng lại lịch cũ đã bị huỷ.
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

    // Le Thi Bich Ngan - HE204710 | Tạo: 18/07/2026, sửa 2026-07-25 (huỷ ngay khi
    // trễ giờ)
    // Chức năng: ban đầu chạy 1 lần lúc 17:05 (ngay khi đóng cửa) — đổi thành quét
    // lặp lại mỗi 5 phút suốt giờ làm việc để huỷ NGAY khi bệnh nhân trễ giờ hẹn,
    // không phải đợi tới cuối ngày mới huỷ hàng loạt.
    @Scheduled(cron = "0 */5 7-17 * * *") // mỗi 5 phút, từ 07:00 đến 17:59
    public void cancelOverdueTodayAppointments() {
        try {
            int cancelled = appointmentService.autoCancelOverdueTodayAppointments();
            if (cancelled > 0) {
                log.info("Tự động huỷ no-show (trễ giờ hẹn): đã huỷ {} lịch hẹn", cancelled);
            }
        } catch (Exception e) {
            log.error("Tự động huỷ no-show (trễ giờ hẹn) thất bại: {}", e.getMessage(), e);
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
