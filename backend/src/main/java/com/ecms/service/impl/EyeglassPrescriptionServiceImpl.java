// DucTKH
// Service xử lý logic nghiệp vụ cho Đơn kính (tạo mới và lấy danh sách đơn kính của bệnh nhân).
package com.ecms.service.impl;

import com.ecms.dto.request.EyeglassPrescriptionRequest;
import com.ecms.dto.response.EyeglassPrescriptionResponse;
import com.ecms.entity.Doctor;
import com.ecms.entity.EyeglassPrescription;
import com.ecms.entity.EyeglassPrescriptionStatus;
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

    // // Tạo mới một đơn kính từ dữ liệu nhập của bác sĩ
    // @Override
    // @Transactional
    // public EyeglassPrescriptionResponse
    // createPrescription(EyeglassPrescriptionRequest request, String doctorEmail) {
    // MedicalRecord record =
    // medicalRecordRepository.findById(request.getMedicalRecordId())
    // .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy bệnh án"));

    // Doctor doctor = doctorRepository.findByEmail(doctorEmail)
    // .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy bác sĩ"));

    // // Kiểm tra xem bác sĩ hiện tại có đúng là người phụ trách hồ sơ bệnh án này
    // // không
    // if (!record.getDoctor().getId().equals(doctor.getId())) {
    // throw new IllegalStateException("Bạn không có quyền kê đơn cho bệnh án này");
    // }

    // EyeglassPrescription prescription = EyeglassPrescription.builder()
    // .medicalRecord(record)
    // .doctor(doctor)
    // .patient(record.getPatient())
    // .odSph(request.getOdSph())
    // .odCyl(request.getOdCyl())
    // .odAxis(request.getOdAxis())
    // .odAdd(request.getOdAdd())
    // .osSph(request.getOsSph())
    // .osCyl(request.getOsCyl())
    // .osAxis(request.getOsAxis())
    // .osAdd(request.getOsAdd())
    // .pd(request.getPd())
    // .lensType(request.getLensType())
    // .notes(request.getNotes())
    // .status(EyeglassPrescriptionStatus.DISPENSED)
    // .build();

    // return toResponse(eyeglassPrescriptionRepository.save(prescription));
    // }

    // Tạo mới một đơn kính — bác sĩ chỉ lưu vào EMR, không còn quyết định gửi xưởng
    // hay không.
    // Mặc định status = SKIPPED (giống "đơn đã kê, chưa yêu cầu gia công tại phòng
    // khám").
    // TODO (chưa làm ở giai đoạn này): bổ sung action cho Bệnh nhân tự quyết định
    // cắt tại phòng khám,
    // khi đó sẽ có endpoint riêng chuyển SKIPPED -> PENDING để đơn vào hàng đợi Lab
    // Technician (UC-36).
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
                .status(EyeglassPrescriptionStatus.SKIPPED)
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

    // Hàng đợi gia công cho Lab Technician: gồm PENDING (chờ), IN_PRODUCTION (đang
    // làm),
    // READY (đã xong, chờ lễ tân giao) — không bao gồm SKIPPED (cắt ngoài) và
    // DISPENSED (đã giao)
    @Override
    @Transactional(readOnly = true)
    public List<EyeglassPrescriptionResponse> getFabricationQueue() {
        return eyeglassPrescriptionRepository
                .findByStatusInOrderByCreatedAtAsc(List.of(EyeglassPrescriptionStatus.PENDING,
                        EyeglassPrescriptionStatus.IN_PRODUCTION, EyeglassPrescriptionStatus.READY))
                .stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    // PENDING -> IN_PRODUCTION : Lab Technician bắt đầu gia công (UC-36 bước 3)
    @Override
    @Transactional
    public EyeglassPrescriptionResponse startFabrication(Long id) {
        EyeglassPrescription p = eyeglassPrescriptionRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy đơn kính"));

        if (!EyeglassPrescriptionStatus.PENDING.equals(p.getStatus())) {
            throw new IllegalStateException("Chỉ có thể bắt đầu gia công đơn kính đang ở trạng thái Chờ gia công");
        }

        p.setStatus(EyeglassPrescriptionStatus.IN_PRODUCTION);
        return toResponse(eyeglassPrescriptionRepository.save(p));
    }

    // IN_PRODUCTION -> READY : Lab Technician hoàn tất gia công (UC-36 bước 6)
    @Override
    @Transactional
    public EyeglassPrescriptionResponse completeFabrication(Long id) {
        EyeglassPrescription p = eyeglassPrescriptionRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy đơn kính"));

        if (!EyeglassPrescriptionStatus.IN_PRODUCTION.equals(p.getStatus())) {
            throw new IllegalStateException("Chỉ có thể hoàn tất gia công đơn kính đang ở trạng thái Đang gia công");
        }

        p.setStatus(EyeglassPrescriptionStatus.READY);
        return toResponse(eyeglassPrescriptionRepository.save(p));
    }

    // [SỬA] dispensePrescription: đổi guard từ PENDING -> READY, vì giờ đây phải
    // gia công xong
    // mới được giao kính cho bệnh nhân (dành cho UC-21, Receptionist dùng ở bước
    // sau)
    @Override
    @Transactional
    public EyeglassPrescriptionResponse dispensePrescription(Long id) {
        EyeglassPrescription p = eyeglassPrescriptionRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy đơn kính"));

        if (!EyeglassPrescriptionStatus.READY.equals(p.getStatus())) {
            throw new IllegalStateException("Chỉ có thể giao đơn kính ở trạng thái Sẵn sàng giao");
        }

        p.setStatus(EyeglassPrescriptionStatus.DISPENSED);
        return toResponse(eyeglassPrescriptionRepository.save(p));
    }

    // skipPrescription giữ nguyên logic cũ — vẫn hợp lệ: hủy yêu cầu cắt tại phòng
    // khám khi
    // đơn còn PENDING (kỹ thuật viên chưa bắt đầu), chuyển hướng bệnh nhân ra cắt
    // ngoài

    // Danh sách đơn kính đã gia công xong, sẵn sàng để Dược sĩ/Lễ tân giao cho bệnh
    // nhân
    @Override
    @Transactional(readOnly = true)
    public List<EyeglassPrescriptionResponse> getReadyPrescriptions() {
        return eyeglassPrescriptionRepository.findByStatusOrderByCreatedAtAsc(EyeglassPrescriptionStatus.READY).stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
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
        return eyeglassPrescriptionRepository.findByStatusOrderByCreatedAtAsc(EyeglassPrescriptionStatus.PENDING)
                .stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    // @Override
    // @Transactional
    // public EyeglassPrescriptionResponse dispensePrescription(Long id) {
    // EyeglassPrescription p = eyeglassPrescriptionRepository.findById(id)
    // .orElseThrow(() -> new com.ecms.exception.ResourceNotFoundException("Không
    // tìm thấy đơn kính"));

    // if (!"PENDING".equals(p.getStatus())) {
    // throw new IllegalStateException("Chỉ có thể phát đơn kính ở trạng thái
    // PENDING");
    // }

    // p.setStatus(EyeglassPrescriptionStatus.DISPENSED);
    // return toResponse(eyeglassPrescriptionRepository.save(p));
    // }

    @Override
    @Transactional
    public EyeglassPrescriptionResponse skipPrescription(Long id) {
        EyeglassPrescription p = eyeglassPrescriptionRepository.findById(id)
                .orElseThrow(() -> new com.ecms.exception.ResourceNotFoundException("Không tìm thấy đơn kính"));

        if (!"PENDING".equals(p.getStatus())) {
            throw new IllegalStateException("Chỉ có thể hủy đơn kính ở trạng thái PENDING");
        }

        p.setStatus(EyeglassPrescriptionStatus.SKIPPED);
        return toResponse(eyeglassPrescriptionRepository.save(p));
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
