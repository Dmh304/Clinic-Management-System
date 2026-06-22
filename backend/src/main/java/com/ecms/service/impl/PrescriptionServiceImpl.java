package com.ecms.service.impl;

import com.ecms.dto.request.PrescriptionItemRequest;
import com.ecms.dto.request.PrescriptionRequest;
import com.ecms.dto.response.PrescriptionItemResponse;
import com.ecms.dto.response.PrescriptionResponse;
import com.ecms.entity.*;
import com.ecms.exception.ResourceNotFoundException;
import com.ecms.repository.*;
import com.ecms.service.PrescriptionService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class PrescriptionServiceImpl implements PrescriptionService {

    private final PrescriptionRepository prescriptionRepository;
    private final MedicineRepository medicineRepository;
    private final MedicalRecordRepository medicalRecordRepository;
    private final DoctorRepository doctorRepository;

    @Override
    @Transactional
    public PrescriptionResponse createPrescription(PrescriptionRequest request, String doctorEmail) {
        MedicalRecord record = medicalRecordRepository.findById(request.getMedicalRecordId())
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy bệnh án"));
        
        Doctor doctor = doctorRepository.findByEmail(doctorEmail)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy bác sĩ"));

        if (!record.getDoctor().getId().equals(doctor.getId())) {
            throw new IllegalStateException("Bạn không có quyền kê đơn cho bệnh án này");
        }

        Prescription prescription = Prescription.builder()
                .medicalRecord(record)
                .doctor(doctor)
                .patient(record.getPatient())
                .notes(request.getNotes())
                .status(PrescriptionStatus.PENDING)
                .items(new ArrayList<>())
                .build();

        for (PrescriptionItemRequest itemReq : request.getItems()) {
            Medicine medicine = medicineRepository.findById(itemReq.getMedicineId())
                    .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy thuốc: " + itemReq.getMedicineId()));
            
            PrescriptionItem item = PrescriptionItem.builder()
                    .prescription(prescription)
                    .medicine(medicine)
                    .quantity(itemReq.getQuantity())
                    .dosage(itemReq.getDosage())
                    .frequency(itemReq.getFrequency())
                    .duration(itemReq.getDuration())
                    .instructions(itemReq.getInstructions())
                    .unitPrice(medicine.getUnitPrice())
                    .build();
            
            prescription.getItems().add(item);
        }

        return toResponse(prescriptionRepository.save(prescription));
    }

    @Override
    @Transactional(readOnly = true)
    public List<PrescriptionResponse> getPatientPrescriptions(Long patientId) {
        return prescriptionRepository.findByPatientIdOrderByCreatedAtDesc(patientId).stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public List<PrescriptionResponse> getPendingPrescriptions() {
        return prescriptionRepository.findByStatusOrderByCreatedAtAsc(PrescriptionStatus.PENDING).stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional
    public PrescriptionResponse dispensePrescription(Long id) {
        Prescription p = prescriptionRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy đơn thuốc"));
        
        if (p.getStatus() != PrescriptionStatus.PENDING) {
            throw new IllegalStateException("Chỉ có thể phát đơn thuốc ở trạng thái PENDING");
        }

        // No inventory deduction logic since inventory management is not in scope.

        p.setStatus(PrescriptionStatus.DISPENSED);
        return toResponse(prescriptionRepository.save(p));
    }

    @Override
    @Transactional
    public PrescriptionResponse skipPrescription(Long id) {
        Prescription p = prescriptionRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy đơn thuốc"));
        
        if (p.getStatus() != PrescriptionStatus.PENDING) {
            throw new IllegalStateException("Chỉ có thể hủy đơn thuốc ở trạng thái PENDING");
        }

        p.setStatus(PrescriptionStatus.SKIPPED);
        return toResponse(prescriptionRepository.save(p));
    }

    private PrescriptionResponse toResponse(Prescription p) {
        return PrescriptionResponse.builder()
                .id(p.getId())
                .medicalRecordId(p.getMedicalRecord().getId())
                .doctorId(p.getDoctor().getId())
                .doctorName(p.getDoctor().getFullName())
                .patientId(p.getPatient().getId())
                .patientName(p.getPatient().getFullName())
                .status(p.getStatus())
                .notes(p.getNotes())
                .createdAt(p.getCreatedAt())
                .items(p.getItems().stream().map(this::toItemResponse).collect(Collectors.toList()))
                .build();
    }

    private PrescriptionItemResponse toItemResponse(PrescriptionItem i) {
        BigDecimal total = i.getUnitPrice() != null ? i.getUnitPrice().multiply(new BigDecimal(i.getQuantity())) : BigDecimal.ZERO;
        return PrescriptionItemResponse.builder()
                .id(i.getId())
                .medicineId(i.getMedicine().getId())
                .medicineName(i.getMedicine().getName())
                .dosageForm(i.getMedicine().getDosageForm())
                .unit(i.getMedicine().getUnit())
                .quantity(i.getQuantity())
                .dosage(i.getDosage())
                .frequency(i.getFrequency())
                .duration(i.getDuration())
                .instructions(i.getInstructions())
                .unitPrice(i.getUnitPrice())
                .totalPrice(total)
                .build();
    }
}
