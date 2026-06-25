package com.ecms.dto.response;

import lombok.*;

import java.util.List;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class ServiceCategoryResponse {
    private Long id;
    private String name;
    private String slug;
    private Integer displayOrder;
    private List<ClinicServiceResponse> services;
}
