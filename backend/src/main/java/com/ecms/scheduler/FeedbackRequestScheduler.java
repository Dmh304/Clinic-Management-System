package com.ecms.scheduler;

import com.ecms.entity.Appointment;
import com.ecms.entity.AppointmentStatus;
import com.ecms.entity.Patient;
import com.ecms.repository.AppointmentRepository;
import com.ecms.repository.FeedbackRepository;
import com.ecms.repository.UserRepository;
import com.ecms.service.EmailService;
import com.ecms.service.NotificationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

/**
 * @author  ThangNB - HE201024
 * @created 2026-07-27
 *
 * UC-48 normal flow bước 1: sau khi buổi khám COMPLETED, hệ thống tự gửi lời mời đánh
 * giá qua Portal (in-app notification) và email.
 *
 * Chạy mỗi giờ, xử lý từng lịch hẹn độc lập: một bệnh nhân thiếu email hoặc SMTP lỗi
 * không được làm dừng cả mẻ.
 *
 * (@EnableScheduling đã được bật sẵn ở BackendApplication.)
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class FeedbackRequestScheduler {

    private final AppointmentRepository appointmentRepository;
    private final FeedbackRepository feedbackRepository;
    private final UserRepository userRepository;
    private final NotificationService notificationService;
    private final EmailService emailService;

    /** Đợi bao lâu sau giờ khám mới mời — mời lúc bệnh nhân còn ở phòng khám thì chưa
     *  đủ trải nghiệm để chấm. */
    @Value("${feedback.request.delay-hours:2}")
    private long delayHours;

    /** Không đào lại lịch cũ hơn ngưỡng này — thiếu chặn dưới thì lần đầu bật tính năng
     *  sẽ gửi mời cho hàng trăm lịch hẹn từ nhiều tháng trước. */
    @Value("${feedback.request.max-age-hours:72}")
    private long maxAgeHours;

    @Value("${app.frontend-base-url:http://localhost:5173}")
    private String frontendBaseUrl;

    @Scheduled(cron = "0 15 * * * *") // mỗi giờ, lệch 15 phút để không đụng cron nhắc lịch
    @Transactional
    public void sendFeedbackRequests() {
        LocalDateTime now = LocalDateTime.now();
        LocalDateTime cutoffNewest = now.minusHours(delayHours);
        LocalDateTime cutoffOldest = now.minusHours(maxAgeHours);

        List<Appointment> due = appointmentRepository.findDueForFeedbackRequest(
                AppointmentStatus.COMPLETED, cutoffNewest, cutoffOldest);

        if (due.isEmpty()) return;
        log.info("UC-48 mời đánh giá: {} lịch hẹn đến hạn trong khoảng {} - {}",
                due.size(), cutoffOldest, cutoffNewest);

        String feedbackLink = frontendBaseUrl + "/patient/feedback";

        for (Appointment a : due) {
            try {
                // BR-21: đã đánh giá rồi thì không mời nữa.
                if (feedbackRepository.existsByAppointment_Id(a.getId())) {
                    a.setFeedbackRequestSent(true);
                    continue;
                }

                Patient patient = a.getPatient();
                if (patient == null) {
                    a.setFeedbackRequestSent(true); // không có người để mời
                    continue;
                }

                String doctorName = a.getDoctor() != null ? a.getDoctor().getFullName() : null;

                // Lịch đặt hộ / walk-in không có tài khoản: bỏ qua in-app, vẫn gửi email.
                if (patient.getUser() != null) {
                    notificationService.createForUser(patient.getUser().getId(),
                            "Buổi khám của bạn đã hoàn tất. Mời bạn đánh giá chất lượng dịch vụ.",
                            a.getId(), "FEEDBACK_REQUEST");
                }

                emailService.sendFeedbackRequest(resolveEmail(a), patient.getFullName(),
                        doctorName, a.getAppointmentTime(), feedbackLink);

                // Đánh dấu SAU khi đã gửi: gửi lỗi thì cờ giữ nguyên để mẻ sau thử lại.
                a.setFeedbackRequestSent(true);
            } catch (Exception e) {
                log.error("Gửi mời đánh giá thất bại cho appointment {}: {}", a.getId(), e.getMessage());
            }
        }
        appointmentRepository.saveAll(due);
    }

    /**
     * Email nhận lời mời: hồ sơ bệnh nhân → tài khoản đăng nhập → người đặt hộ lịch.
     *
     * @param a lịch hẹn đã hoàn thành
     * @return địa chỉ email, hoặc null nếu không tìm được ai để gửi
     */
    private String resolveEmail(Appointment a) {
        Patient p = a.getPatient();
        String email = p.getEmail();
        if (email == null || email.isBlank()) {
            email = p.getUser() != null ? p.getUser().getEmail() : null;
        }
        if ((email == null || email.isBlank()) && a.getBookedBy() != null) {
            email = userRepository.findById(a.getBookedBy())
                    .map(u -> u.getEmail()).orElse(null);
        }
        return email;
    }
}
