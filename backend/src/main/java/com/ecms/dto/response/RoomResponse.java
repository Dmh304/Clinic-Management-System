package com.ecms.dto.response;

import com.ecms.entity.RoomCategory;
import lombok.*;

import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RoomResponse {
    private Long id;
    private String name;
    private RoomCategory category;
    private Long serviceId;
    private String serviceName;
    private Integer capacity;
    private String status;

    /**
     * Nhân sự đang trực phòng này hôm nay (nếu có) — hiển thị nhanh trên list (bước
     * 2 UC-55).
     */
    private String currentStaffFullName;
    private String currentStaffType;

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}