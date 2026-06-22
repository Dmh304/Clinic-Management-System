package com.ecms.dto.request;

import java.time.LocalDateTime;

import org.hibernate.annotations.NotFound;
import org.hibernate.annotations.NotFoundAction;
import org.springframework.cglib.core.Local;

import com.ecms.entity.Doctor;
import com.ecms.entity.LabOrderStatus;
import com.ecms.entity.LabPriority;
import com.ecms.entity.LabTechnician;
import com.ecms.entity.MedicalRecord;

import jakarta.persistence.Column;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import lombok.Data;

@Data
public class LabOrderRequest {

    private Long medicalRecordId;

    private Long doctorId;

    private Long patientId;

    private Long labTechnicianId;

    private String notes;

    private String rejectionReason;

    private LocalDateTime rejectedAt;

    private LabPriority priority;

    private LabOrderStatus status;

}
