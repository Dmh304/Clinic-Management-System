package com.ecms.service.impl;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;

import com.ecms.dto.request.LabOrderRequest;
import com.ecms.dto.request.LabResultRequest;
import com.ecms.dto.response.LabOrderResponse;
import com.ecms.dto.response.LabResultResponse;
import com.ecms.entity.LabOrder;
import com.ecms.entity.LabOrderStatus;
import com.ecms.entity.LabResult;
import com.ecms.entity.LabTechnician;
import com.ecms.entity.MedicalRecord;
import com.ecms.repository.DoctorRepository;
import com.ecms.repository.LabOrderRepository;
import com.ecms.repository.LabResultRepository;
import com.ecms.repository.MedicalRecordRepository;
import com.ecms.repository.LabTechnicianRepository;
import com.ecms.service.LabOrderService;

import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class LabOrderServiceImpl implements LabOrderService {

    private final LabOrderRepository labOrderRepository;
    private final LabResultRepository labResultRepository;
    private final MedicalRecordRepository medicalRecordRepository;
    private final DoctorRepository doctorRepository;
    private final LabTechnicianRepository labTechnicianRepository;

    @Override
    @Transactional
    public LabOrderResponse createLabOrder(LabOrderRequest request, Long doctorId) {
        LabOrder labOrder = LabOrder.builder()
                .medicalRecord(medicalRecordRepository.getReferenceById(request.getMedicalRecordId()))
                .doctor(doctorRepository.getReferenceById(doctorId))
                .labTechnician(request.getLabTechnicianId() != null
                        ? labTechnicianRepository.getReferenceById(request.getLabTechnicianId())
                        : null)
                .priority(request.getPriority())
                .notes(request.getNotes())
                .build();

        LabOrder saved = labOrderRepository.save(labOrder);
        return toOrderResponse(saved);
    }

    @Override
    public List<LabOrderResponse> getLabQueue(Long labTechnicianId) {
        return labOrderRepository
                .findByLabTechnicianId(labTechnicianId)
                .stream()
                .map(this::toOrderResponse)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional
    public LabOrderResponse submitLabResult(Long labOrderId, LabResultRequest request, Long labTechnicianId) {
        LabOrder labOrder = labOrderRepository.findById(labOrderId)
                .orElseThrow(() -> new RuntimeException("LabOrder not found: " + labOrderId));
        if (labOrder.getLabTechnician() == null || !labOrder.getLabTechnician().getId().equals(labTechnicianId)) {
            throw new AccessDeniedException("You are not authorized");
        }

        LabResult labResult = LabResult.builder()
                .labOrder(labOrder)
                .vaL(request.getVaL()).vaR(request.getVaR())
                .bcvaL(request.getBcvaL()).bcvaR(request.getBcvaR())
                .sphL(request.getSphL()).cylL(request.getCylL()).axisL(request.getAxisL()).iopL(request.getIopL())
                .sphR(request.getSphR()).cylR(request.getCylR()).axisR(request.getAxisR()).iopR(request.getIopR())
                .imageUrl(request.getImageUrl())
                .doctorNotes(request.getDoctorNotes())
                .labTechnician(labTechnicianRepository.getReferenceById(labTechnicianId))
                // reviewed_by đang NOT NULL trên entity LabResult nên phải gán ngay lúc tạo;
                // gán tạm là bác sĩ chỉ định order, còn reviewedAt chỉ set khi Doctor thực sự
                // mở xem (xem getResults bên dưới)
                .doctor(labOrder.getDoctor())
                .build();

        labResultRepository.save(labResult);

        labOrder.setStatus(LabOrderStatus.SUBMITTED);
        labOrder.setCompletedAt(LocalDateTime.now());
        LabOrder saved = labOrderRepository.save(labOrder);

        return toOrderResponse(saved);
    }

    @Override
    public List<LabOrderResponse> getLabOrdersForMedicalRecord(Long medicalRecordId) {
        return labOrderRepository
                .findByMedicalRecordId(medicalRecordId)
                .stream()
                .map(this::toOrderResponse)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional
    public LabResultResponse getLabResults(Long labOrderId, Long currentUserId, String currentUserRole) {
        LabOrder labOrder = labOrderRepository.findById(labOrderId)
                .orElseThrow(() -> new RuntimeException("LabOrder not found: " + labOrderId));

        boolean isPatient = "PATIENT".equalsIgnoreCase(currentUserRole);

        if (isPatient) {
            if (!labOrder.getMedicalRecord().getPatient().getId().equals(currentUserId)) {
                throw new AccessDeniedException("You are not authorized");
            }

            if (labOrder.getStatus() != LabOrderStatus.APPROVED) {
                throw new IllegalStateException("LabOrder is not ready yet");
            }
        } else {
            if (labOrder.getStatus() != LabOrderStatus.APPROVED && labOrder.getStatus() != LabOrderStatus.SUBMITTED) {
                throw new IllegalStateException("LabOrder is not ready yet");
            }
        }
        LabResult labResult = labResultRepository.findByLabOrderId(labOrderId)
                .orElseThrow(() -> new RuntimeException("LabResult not found for LabOrder: " + labOrderId));

        return toResultResponse(labResult);
    }

    @Override
    @Transactional
    public LabOrderResponse approveLabResult(Long labOrderId, Long doctorId) {
        LabOrder labOrder = labOrderRepository.findById(labOrderId)
                .orElseThrow(() -> new RuntimeException("LabOrder not found: " + labOrderId));

        if (labOrder.getDoctor() == null || !labOrder.getDoctor().getId().equals(doctorId)) {
            throw new AccessDeniedException("You are not authorized");
        }
        if (labOrder.getStatus() != LabOrderStatus.SUBMITTED) {
            throw new IllegalStateException("Can only approve a SUBMITTED LabOrder");
        }

        LabResult labResult = labResultRepository.findByLabOrderId(labOrderId)
                .orElseThrow(() -> new RuntimeException("LabResult not found for LabOrder: " + labOrderId));
        labResult.setReviewedAt(LocalDateTime.now());
        labResultRepository.save(labResult);

        labOrder.setStatus(LabOrderStatus.APPROVED);
        LabOrder saved = labOrderRepository.save(labOrder);

        return toOrderResponse(saved);
    }

    @Override
    public LabOrderResponse requestRetest(Long labOrderId, Long doctorId, LabOrderRequest request) {
        LabOrder previousOrder = labOrderRepository.findById(labOrderId)
                .orElseThrow(() -> new RuntimeException("LabOrder not found: " + labOrderId));

        if (previousOrder.getDoctor() == null || !previousOrder.getDoctor().getId().equals(doctorId)) {
            throw new AccessDeniedException("You are not authorized");
        }

        if (previousOrder.getStatus() != LabOrderStatus.SUBMITTED) {
            throw new IllegalStateException("Can request a retest for a SUBMITTED Order only");
        }

        previousOrder.setStatus(LabOrderStatus.REJECTED);

        /** Thảo luận xem có nên thêm reject reason và time vào không */
        previousOrder.setRejectionReason(request.getRejectionReason());
        previousOrder.setRejectedAt(LocalDateTime.now());

        labOrderRepository.save(previousOrder);

        LabOrder newOrder = LabOrder.builder()
                .medicalRecord(previousOrder.getMedicalRecord())
                .doctor(previousOrder.getDoctor())
                .labTechnician(previousOrder.getLabTechnician())
                .priority(previousOrder.getPriority())
                .notes(previousOrder.getNotes())
                // .previousLabOrder(previousOrder)
                .build();

        LabOrder saved = labOrderRepository.save(newOrder);

        return toOrderResponse(saved);
    }

    private LabOrderResponse toOrderResponse(LabOrder labOrder) {
        return LabOrderResponse.builder()
                .id(labOrder.getId())
                .medicalRecordId(labOrder.getMedicalRecord().getId())
                .doctorFullName(labOrder.getDoctor() != null ? labOrder.getDoctor().getFullName() : null)
                .labTechnicianFullName(
                        labOrder.getLabTechnician() != null ? labOrder.getLabTechnician().getFullName() : null)
                .patientFullName(labOrder.getMedicalRecord().getPatient() != null
                        ? labOrder.getMedicalRecord().getPatient().getFullName()
                        : null)
                .notes(labOrder.getNotes())
                .priority(labOrder.getPriority())
                .status(labOrder.getStatus())
                .createdAt(labOrder.getCreatedAt())
                .completedAt(labOrder.getCompletedAt())
                .rejectionReason(labOrder.getRejectionReason())
                .rejectedAt(labOrder.getRejectedAt())
                .build();
    }

    private LabResultResponse toResultResponse(LabResult labResult) {
        LabOrder labOrder = labResult.getLabOrder();
        return LabResultResponse.builder()
                .id(labResult.getId())
                .labOrderId(labOrder.getId())
                .medicalRecordId(labOrder.getMedicalRecord().getId())
                .vaL(labResult.getVaL()).vaR(labResult.getVaR())
                .bcvaL(labResult.getBcvaL()).bcvaR(labResult.getBcvaR())
                .sphL(labResult.getSphL()).cylL(labResult.getCylL()).axisL(labResult.getAxisL())
                .iopL(labResult.getIopL())
                .sphR(labResult.getSphR()).cylR(labResult.getCylR()).axisR(labResult.getAxisR())
                .iopR(labResult.getIopR())
                .imageUrl(labResult.getImageUrl())
                .doctorNotes(labResult.getDoctorNotes())
                .labTechnicianId(labResult.getLabTechnician() != null ? labResult.getLabTechnician().getId() : null)
                .labTechnicianFullName(
                        labResult.getLabTechnician() != null ? labResult.getLabTechnician().getFullName() : null)
                .doctorId(labResult.getDoctor() != null ? labResult.getDoctor().getId() : null)
                .doctorFullName(labResult.getDoctor() != null ? labResult.getDoctor().getFullName() : null)
                .patientId(labOrder.getMedicalRecord().getPatient() != null
                        ? labOrder.getMedicalRecord().getPatient().getId()
                        : null)
                .patientFullName(labOrder.getMedicalRecord().getPatient() != null
                        ? labOrder.getMedicalRecord().getPatient().getFullName()
                        : null)
                .reviewedAt(labResult.getReviewedAt())
                .createdAt(labResult.getCreatedAt())
                .updatedAt(labResult.getUpdatedAt())
                .build();
    }
}
