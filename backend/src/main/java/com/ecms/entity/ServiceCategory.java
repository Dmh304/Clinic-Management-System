package com.ecms.entity;

import jakarta.persistence.*;
import lombok.*;

import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "service_categories")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class ServiceCategory {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 300)
    private String name;

    @Column(unique = true, length = 200)
    private String slug;

    @Column(name = "display_order")
    private Integer displayOrder;

    @OneToMany(mappedBy = "category", fetch = FetchType.LAZY)
    @OrderBy("displayOrder ASC")
    private List<ClinicService> services = new ArrayList<>();

    @PrePersist
    private void prePersist() {
        if (this.displayOrder == null) this.displayOrder = 0;
    }
}
