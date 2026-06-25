package com.ecms.scheduler;

import com.ecms.entity.Appointment;
import com.ecms.entity.AppointmentStatus;
import com.ecms.repository.AppointmentRepository;
import com.ecms.service.AppointmentService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.util.List;

/**
 * UC-13: Cron job gửi email nhắc lịch hẹn 24h trước giờ khám.
 *
 * Mỗi giờ quét các lịch hẹn CONFIRMED có giờ khám rơi vào cửa sổ [now+24h,
 * now+25h] và chưa từng được nhắc (reminderSent=false), rồi gửi nhắc qua
 * {@link AppointmentService#sendReminder(Long)} (dùng chung với endpoint nhắc
 * thủ công). Lỗi của từng lịch hẹn được log lại và không làm dừng vòng lặp.
 *
 * (@EnableScheduling đã được bật sẵn ở BackendApplication.)
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class AppointmentReminderScheduler {

    private final AppointmentRepository appointmentRepository;
    private final AppointmentService appointmentService;

    @Scheduled(cron = "0 0 * * * *") // mỗi giờ, đúng theo đặc tả UC-13
    public void sendReminders() {
        LocalDateTime windowStart = LocalDateTime.now().plusHours(24);
        LocalDateTime windowEnd = windowStart.plusHours(1);

        List<Appointment> due = appointmentRepository
                .findByStatusAndAppointmentTimeBetweenAndReminderSentFalse(
                        AppointmentStatus.CONFIRMED, windowStart, windowEnd);

        log.info("UC-13 nhắc lịch: tìm thấy {} lịch hẹn cần nhắc trong khoảng {} - {}",
                due.size(), windowStart, windowEnd);

        for (Appointment a : due) {
            try {
                appointmentService.sendReminder(a.getId());
            } catch (Exception e) {
                log.error("Gửi nhắc lịch thất bại cho appointment {}: {}", a.getId(), e.getMessage());
            }
        }
    }
}
