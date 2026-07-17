package com.ecms.dto.response;

import lombok.*;

import java.time.LocalDateTime;
import java.util.List;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class RoomResponse {
    private Long id;
    private String name;
    private String roomType;
    private Integer capacity;
    private Boolean isActive;
    private List<ServiceOption> services;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
    public static class ServiceOption {
        private Long id;
        private String serviceName;
    }
}
