package com.ecms.util;

import java.time.DayOfWeek;
import java.time.LocalDateTime;
import java.time.LocalTime;

/**
 * Utility kiểm tra giờ hành chính của phòng khám (07:30–17:00, trừ Chủ nhật).
 * Dùng để khóa các thao tác lâm sàng (bắt đầu khám, cập nhật HSBA, bắt đầu
 * đo...)
 * ngoài giờ làm việc — áp dụng cho Doctor và Lab Technician.
 */
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

    /**
     * Ném lỗi rõ ràng nếu đang ngoài giờ hành chính — dùng ở đầu các thao tác lâm
     * sàng.
     */
    public static void requireWithinClinicHours() {
        if (!isWithinClinicHours()) {
            throw new IllegalStateException(
                    "Thao tác này chỉ được thực hiện trong giờ làm việc của phòng khám (07:30–17:00, trừ Chủ nhật).");
        }
    }
}