package com.ecms.util;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;

public final class ClinicHoursUtil {

    public static final LocalTime OPEN_TIME = LocalTime.of(7, 30);
    public static final LocalTime CLOSE_TIME = LocalTime.of(17, 0);

    private ClinicHoursUtil() {
    }

    public static boolean isWithinClinicHours(LocalDateTime now) {
        if (now.getDayOfWeek() == DayOfWeek.SUNDAY) {
            return false;
        }
        LocalTime t = now.toLocalTime();
        return !t.isBefore(OPEN_TIME) && !t.isAfter(CLOSE_TIME);
    }

    public static boolean isWithinClinicHours() {
        return isWithinClinicHours(LocalDateTime.now());
    }

    /** Ném lỗi nếu đang ngoài giờ hành chính. */
    public static void requireWithinClinicHours() {
        if (!isWithinClinicHours()) {
            throw new IllegalStateException(
                    "Thao tác này chỉ được thực hiện trong giờ làm việc của phòng khám (07:30–17:00, trừ Chủ nhật).");
        }
    }

    /** Ném lỗi nếu ngày truyền vào không phải hôm nay. */
    public static void requireIsToday(LocalDate date) {
        if (date == null || !date.isEqual(LocalDate.now())) {
            throw new IllegalStateException(
                    "Chỉ có thể thao tác với lịch hẹn của ngày hôm nay.");
        }
    }

    /**
     * Kiểm tra gộp: lịch hẹn phải đúng ngày hôm nay VÀ đang trong giờ hành chính.
     * Dùng cho các thao tác lâm sàng (bắt đầu khám, cập nhật HSBA, bắt đầu đo...).
     */
    public static void requireOperableToday(LocalDate appointmentDate) {
        requireIsToday(appointmentDate);
        requireWithinClinicHours();
    }
}