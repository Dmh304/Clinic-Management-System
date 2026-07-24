//Author: TuanTD, DucTKH
//Created: 2026-06-22
//Last Update: 2026-07-22
// Service xử lý logic nghiệp vụ cho Đơn kính (tạo mới và lấy danh sách đơn kính của bệnh nhân).
package com.ecms.service.impl;

import com.ecms.dto.request.EyeglassPrescriptionRequest;
import com.ecms.dto.response.EyeglassPrescriptionResponse;
import com.ecms.entity.Doctor;
import com.ecms.entity.EyeglassPrescription;
//import com.ecms.entity.EyeglassPrescriptionStatus;
import com.ecms.entity.MedicalRecord;
import com.ecms.exception.ResourceNotFoundException;
import com.ecms.repository.DoctorRepository;
import com.ecms.repository.EyeglassPrescriptionRepository;
import com.ecms.repository.LensTypeRepository;
import com.ecms.repository.MedicalRecordRepository;
import com.ecms.repository.EyeglassOrderRepository;
import com.ecms.entity.EyeglassOrderStatus;
import com.ecms.service.EyeglassPrescriptionService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class EyeglassPrescriptionServiceImpl implements EyeglassPrescriptionService {

    private final EyeglassPrescriptionRepository eyeglassPrescriptionRepository;
    private final MedicalRecordRepository medicalRecordRepository;
    private final DoctorRepository doctorRepository;
    private final LensTypeRepository lensTypeRepository;
    private final EyeglassOrderRepository eyeglassOrderRepository;

    // Tạo mới một đơn kính — bác sĩ chỉ lưu vào EMR (thông số lâm sàng).
    // Vòng đời sản xuất/giao kính (PENDING_LAB -> IN_PRODUCTION -> READY ->
    // DISPENSED)
    // KHÔNG còn thuộc entity này — thuộc EyeglassOrder, tạo ra ở bước Lễ tân xác
    // nhận
    // đặt hàng (UC-41), tham chiếu ngược lại prescription này để lấy thông số
    // readonly.
    @Override
    @Transactional
    public EyeglassPrescriptionResponse createPrescription(EyeglassPrescriptionRequest request, String doctorEmail) {
        MedicalRecord record = medicalRecordRepository.findById(request.getMedicalRecordId())
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy bệnh án"));

        Doctor doctor = doctorRepository.findByEmail(doctorEmail)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy bác sĩ"));

        if (!record.getDoctor().getId().equals(doctor.getId())) {
            throw new IllegalStateException("Bạn không có quyền kê đơn cho bệnh án này");
        }

        com.ecms.entity.LensType lensType = lensTypeRepository.findById(request.getLensTypeId())
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy loại tròng kính"));

        EyeglassPrescription prescription = EyeglassPrescription.builder()
                .medicalRecord(record)
                .doctor(doctor)
                .patient(record.getPatient())
                .odSph(request.getOdSph())
                .odCyl(request.getOdCyl())
                .odAxis(request.getOdAxis())
                .odAdd(request.getOdAdd())
                .osSph(request.getOsSph())
                .osCyl(request.getOsCyl())
                .osAxis(request.getOsAxis())
                .osAdd(request.getOsAdd())
                .pd(request.getPd())
                .lensType(lensType)
                .notes(request.getNotes())
                // .status(EyeglassPrescriptionStatus.ISSUED)
                .build();

        return toResponse(eyeglassPrescriptionRepository.save(prescription));
    }

    // Lấy chi tiết 1 đơn kính theo id — dùng cho trang chi tiết gia công của Lab
    // Technician
    @Override
    @Transactional(readOnly = true)
    public EyeglassPrescriptionResponse getById(Long id) {
        EyeglassPrescription p = eyeglassPrescriptionRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy đơn kính"));
        return toResponse(p);
    }

    // Lấy danh sách toàn bộ đơn kính đã được kê cho một bệnh nhân
    @Override
    @Transactional(readOnly = true)
    public List<EyeglassPrescriptionResponse> getPatientPrescriptions(Long patientId) {
        return eyeglassPrescriptionRepository.findByPatientIdOrderByCreatedAtDesc(patientId).stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public List<EyeglassPrescriptionResponse> getByMedicalRecordId(Long medicalRecordId) {
        return eyeglassPrescriptionRepository.findByMedicalRecordId(medicalRecordId).stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public List<EyeglassPrescriptionResponse> getPendingPrescriptions() {
        // return
        // eyeglassPrescriptionRepository.findByStatusOrderByCreatedAtAsc(EyeglassPrescriptionStatus.ISSUED)
        // .stream()
        // .map(this::toResponse)
        // .collect(Collectors.toList());
        return null;
    }

    // Hàm bổ trợ để chuyển đổi từ Entity sang DTO để trả về cho Frontend
    private EyeglassPrescriptionResponse toResponse(EyeglassPrescription p) {
        boolean isOrdered = eyeglassOrderRepository.existsByPrescriptionIdAndStatusNot(p.getId(), EyeglassOrderStatus.CANCELLED);
        boolean isExpired = p.getCreatedAt().plusMonths(12).isBefore(java.time.LocalDateTime.now());
        
        List<EyeglassPrescription> latestList = eyeglassPrescriptionRepository.findByPatientIdOrderByCreatedAtDesc(p.getPatient().getId());
        boolean hasNewer = !latestList.isEmpty() && !latestList.get(0).getId().equals(p.getId());

        return EyeglassPrescriptionResponse.builder()
                .id(p.getId())
                .medicalRecordId(p.getMedicalRecord().getId())
                .doctorId(p.getDoctor().getId())
                .doctorName(p.getDoctor().getFullName())
                .patientId(p.getPatient().getId())
                .patientName(p.getPatient().getFullName())
                .odSph(p.getOdSph())
                .odCyl(p.getOdCyl())
                .odAxis(p.getOdAxis())
                .odAdd(p.getOdAdd())
                .osSph(p.getOsSph())
                .osCyl(p.getOsCyl())
                .osAxis(p.getOsAxis())
                .osAdd(p.getOsAdd())
                .pd(p.getPd())
                .lensTypeId(p.getLensType() != null ? p.getLensType().getId() : null)
                .lensTypeName(p.getLensType() != null ? p.getLensType().getName() : null)
                .lensTypePrice(p.getLensType() != null ? p.getLensType().getBasePrice() : null)
                .notes(p.getNotes())
                // .status(p.getStatus())
                .createdAt(p.getCreatedAt())
                .isOrdered(isOrdered)
                .isExpired(isExpired)
                .hasNewer(hasNewer)
                .build();
    }
}
