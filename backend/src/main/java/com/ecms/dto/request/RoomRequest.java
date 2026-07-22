package com.ecms.dto.request;

import com.ecms.entity.RoomCategory;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RoomRequest {
    private String name;
    private RoomCategory category;
    /** Optional — chỉ gán khi phòng phục vụ đúng 1 dịch vụ cụ thể. */
    private Long serviceId;
    private Integer capacity;
}