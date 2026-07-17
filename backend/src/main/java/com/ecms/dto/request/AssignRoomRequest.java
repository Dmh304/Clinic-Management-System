// UC-59: phân công 1 nhân sự vào 1 phòng — standing (mặc định) hoặc override 1 ngày (ALT-1).
package com.ecms.dto.request;

import jakarta.validation.constraints.NotNull;
import lombok.*;

import java.time.LocalDate;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class AssignRoomRequest {

    @NotNull(message = "Vui lòng chọn nhân sự")
    private Long staffUserId;

    @NotNull(message = "Vui lòng chọn phòng")
    private Long roomId;

    /** Ngày bắt đầu áp dụng phân công standing — bỏ trống = áp dụng từ hôm nay. Bỏ qua nếu oneDayOnly = true. */
    private LocalDate effectiveFrom;

    /** ALT-1: true = chỉ đổi phòng cho đúng 1 ngày (overrideDate), hôm sau quay lại phân công standing trước đó. */
    private Boolean oneDayOnly;

    /** Bắt buộc khi oneDayOnly = true. */
    private LocalDate overrideDate;

    /** E-2: true để vẫn phân công dù phòng đã đủ sức chứa cho ngày áp dụng (Manager xác nhận override). */
    private Boolean forceOverrideCapacity;
}
