package com.ecms.dto.request;

import com.ecms.entity.StaffType;
import lombok.*;

import java.time.LocalDate;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class StaffRoomAssignmentRequest {
    private StaffType staffType;
    private Long staffId;
    private Long roomId;

    /**
     * Ngày assignment có hiệu lực (mặc định hôm nay nếu null).
     * Với standing assignment: đây là effectiveFrom.
     * Với override 1 ngày: đây chính là workDate.
     */
    private LocalDate date;

    /** true = chỉ áp dụng đúng `date` (ALT-1), false = standing assignment. */
    @Builder.Default
    private Boolean oneDayOverride = false;

    /**
     * Cho phép Manager xác nhận ghi đè dù phòng đã có người trực trùng ngày
     * (ALT-2).
     */
    @Builder.Default
    private Boolean forceOverride = false;
}