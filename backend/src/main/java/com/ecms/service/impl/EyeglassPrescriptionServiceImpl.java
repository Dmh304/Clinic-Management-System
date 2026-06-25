// DucTKH
// Service xử lý logic nghiệp vụ cho Đơn kính (tạo mới và lấy danh sách đơn kính của bệnh nhân).
package com.ecms.service.impl;

import com.ecms.dto.request.EyeglassPrescriptionRequest;
import com.ecms.dto.response.EyeglassPrescriptionResponse;
import com.ecms.entity.Doctor;
import com.ecms.entity.EyeglassPrescription;
import com.ecms.entity.MedicalRecord;
import com.ecms.exception.ResourceNotFoundException;
import com.ecms.repository.DoctorRepository;
import com.ecms.repository.EyeglassPrescriptionRepository;
import com.ecms.repository.MedicalRecordRepository;
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

    // Tạo mới một đơn kính từ dữ liệu nhập của bác sĩ
    @Override
    @Transactional
    public EyeglassPrescriptionResponse createPrescription(EyeglassPrescriptionRequest request, String doctorEmail) {
        MedicalRecord record = medicalRecordRepository.findById(request.getMedicalRecordId())
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy bệnh án"));

        Doctor doctor = doctorRepository.findByEmail(doctorEmail)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy bác sĩ"));

        // Kiểm tra xem bác sĩ hiện tại có đúng là người phụ trách hồ sơ bệnh án này
        // không
        if (!record.getDoctor().getId().equals(doctor.getId())) {
            throw new IllegalStateException("Bạn không có quyền kê đơn cho bệnh án này");
        }

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
                .lensType(request.getLensType())
                .notes(request.getNotes())
                .status("ISSUED")
                .build();

        return toResponse(eyeglassPrescriptionRepository.save(prescription));
    }

    // Lấy danh sách toàn bộ đơn kính đã được kê cho một bệnh nhân
    @Override
    @Transactional(readOnly = true)
    public List<EyeglassPrescriptionResponse> getPatientPrescriptions(Long patientId) {
        return eyeglassPrescriptionRepository.findByPatientIdOrderByCreatedAtDesc(patientId).stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    // Hàm bổ trợ để chuyển đổi từ Entity sang DTO để trả về cho Frontend
    private EyeglassPrescriptionResponse toResponse(EyeglassPrescription p) {
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
                .lensType(p.getLensType())
                .notes(p.getNotes())
                .status(p.getStatus())
                .createdAt(p.getCreatedAt())
                .build();
    }
}
