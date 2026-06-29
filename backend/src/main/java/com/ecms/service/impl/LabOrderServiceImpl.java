/**
 * Author: TuanTD
 * 
 * Triển khai các nghiệp vụ quản lý xét nghiệm trong hệ thống
 *
 * Quy trình nghiệp vụ:
 *
 * 1. Doctor tạo Lab Order (phiếu chỉ định xét nghiệm)
 * 2. Lab Technician nhận và bắt đầu thực hiện xét nghiệm
 * 3. Lab Technician lưu nháp hoặc gửi kết quả
 * 4. Doctor xem và duyệt kết quả
 * 5. Kết quả được đồng bộ vào Medical Record
 * 6. Doctor có thể yêu cầu xét nghiệm lại nếu cần
 */

package com.ecms.service.impl;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;

import com.ecms.dto.request.LabOrderRequest;
import com.ecms.dto.request.LabResultRequest;
import com.ecms.dto.response.LabOrderResponse;
import com.ecms.dto.response.LabResultResponse;
import com.ecms.dto.response.LabTechnicianResponse;
import com.ecms.entity.Doctor;
import com.ecms.entity.LabOrder;
import com.ecms.entity.LabOrderStatus;
import com.ecms.entity.LabResult;
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
    private final ObjectMapper objectMapper;

    /**
     * Tạo mới một phiếu chỉ định xét nghiệm.
     *
     * Người thực hiện: Doctor
     *
     * Chức năng:
     * - Liên kết Medical Record
     * - Liên kết Doctor chỉ định
     * - Gán Lab Technician
     * - Thiết lập mức độ ưu tiên
     * - Lưu ghi chú của bác sĩ
     *
     * Trạng thái khởi tạo:
     * - PENDING
     */
    @Override
    @Transactional
    public LabOrderResponse createLabOrder(LabOrderRequest request, Long doctorId) {
        // ── Chặn tạo mới nếu đang có LabOrder chưa hoàn tất ─────────────
        boolean hasActiveOrder = labOrderRepository.existsByMedicalRecordIdAndStatusIn(
                request.getMedicalRecordId(),
                List.of(LabOrderStatus.PENDING, LabOrderStatus.IN_PROGRESS));

        boolean hasUnreviewedOrder = labOrderRepository.existsByMedicalRecordIdAndStatusIn(request.getMedicalRecordId(),
                List.of(LabOrderStatus.SUBMITTED));
        if (hasActiveOrder) {
            throw new IllegalStateException(
                    "Hồ sơ bệnh án này đang có phiếu xét nghiệm chưa hoàn tất (PENDING hoặc IN_PROGRESS). " +
                            "Vui lòng chờ kỹ thuật viên hoàn thành trước khi tạo phiếu mới.");
        }

        if (hasUnreviewedOrder) {
            throw new IllegalStateException(
                    "Hồ sơ bệnh án này đang có phiếu xét nghiệm cần được duyệt. Vui lòng kiểm tra danh sách phiếu xét nghiệm cần duyệt");
        }
        // ─────────────────────────────────────────────────────────────────

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

    /**
     * Lấy danh sách các phiếu xét nghiệm được phân công
     * cho một kỹ thuật viên
     */
    @Override
    @Transactional
    public List<LabOrderResponse> getLabQueue(Long labTechnicianId) {
        return labOrderRepository
                .findByLabTechnicianIdOrderByPriorityAndCreatedAt(labTechnicianId)
                .stream()
                .map(this::toOrderResponse)
                .collect(Collectors.toList());
    }

    /**
     * Nộp kết quả xét nghiệm hoàn chỉnh.
     *
     * Quy trình:
     * 1. Tạo bản ghi LabResult
     * 2. Lưu toàn bộ chỉ số đo mắt
     * 3. Lưu ảnh xét nghiệm
     * 4. Ghi nhận kỹ thuật viên thực hiện
     * 5. Chuyển LabOrder sang SUBMITTED
     * 6. Ghi nhận thời điểm hoàn thành
     *
     * Sau khi gửi:
     * - Kỹ thuật viên không được sửa nữa
     * - Chờ bác sĩ duyệt
     */
    @Override
    @Transactional
    public LabOrderResponse submitLabResult(Long labOrderId, LabResultRequest request, Long labTechnicianId) {
        LabOrder labOrder = labOrderRepository.findById(labOrderId)
                .orElseThrow(() -> new RuntimeException("LabOrder not found: " + labOrderId));
        if (labOrder.getLabTechnician() == null || !labOrder.getLabTechnician().getId().equals(labTechnicianId)) {
            throw new AccessDeniedException("You are not authorized");
        }
        if (labOrder.getStatus() != LabOrderStatus.IN_PROGRESS) {
            throw new IllegalStateException("Can only submit results for an IN_PROGRESS LabOrder");
        }
        LabResult labResult = LabResult.builder()
                .labOrder(labOrder)
                .vaL(request.getVaL()).vaR(request.getVaR())
                .bcvaL(request.getBcvaL()).bcvaR(request.getBcvaR())
                .sphL(request.getSphL()).cylL(request.getCylL()).axisL(request.getAxisL()).iopL(request.getIopL())
                .sphR(request.getSphR()).cylR(request.getCylR()).axisR(request.getAxisR()).iopR(request.getIopR())
                .imageUrls(toJson(request.getImageUrls()))
                .doctorNotes(request.getDoctorNotes())
                .labTechnician(labTechnicianRepository.getReferenceById(labTechnicianId))
                .doctor(labOrder.getDoctor())
                .build();

        labResultRepository.save(labResult);

        labOrder.setStatus(LabOrderStatus.SUBMITTED);
        labOrder.setCompletedAt(LocalDateTime.now());
        LabOrder saved = labOrderRepository.save(labOrder);

        return toOrderResponse(saved);
    }

    @Override
    @Transactional
    public List<LabOrderResponse> getLabOrdersForMedicalRecord(Long medicalRecordId) {
        return labOrderRepository
                .findByMedicalRecordIdOrderByCreatedAt(medicalRecordId)
                .stream()
                .map(this::toOrderResponse)
                .collect(Collectors.toList());
    }

    /**
     * Trả về kết quả xét nghiệm.
     */
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
            if (labOrder.getStatus() != LabOrderStatus.APPROVED && labOrder.getStatus() != LabOrderStatus.SUBMITTED
                    && labOrder.getStatus() != LabOrderStatus.IN_PROGRESS) {
                throw new IllegalStateException("LabOrder is not ready yet");
            }
        }
        LabResult labResult = labResultRepository.findTopByLabOrderIdOrderByIdDesc(labOrderId)
                .orElseThrow(() -> new RuntimeException("LabResult not found for LabOrder: " + labOrderId));

        return toResultResponse(labResult);
    }

    /**
     * Duyệt kết quả xét nghiệm
     * 
     * Quy trình:
     * 1. Kiểm tra quyền truy cập
     * 2. Ghi nhận thời điểm duyệt
     * 3. Đồng bộ dữ liệu từ LabResult
     * sang MedicalRecord
     * 4. Chuyển trạng thái sang APPROVED
     *
     * Lưu ý:
     * Sau khi duyệt, Medical Record sẽ được cập nhật
     * tự động bằng các chỉ số xét nghiệm mới nhất
     */
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

        LabResult labResult = labResultRepository.findTopByLabOrderIdOrderByIdDesc(labOrderId)
                .orElseThrow(() -> new RuntimeException("LabResult not found for LabOrder: " + labOrderId));
        labResult.setReviewedAt(LocalDateTime.now());
        labResultRepository.save(labResult);

        // ── Auto-fill MedicalRecord từ LabResult ─────────────────────
        MedicalRecord record = labOrder.getMedicalRecord();

        // Chỉ fill nếu chưa có giá trị (không ghi đè dữ liệu bác sĩ đã nhập thủ công)
        record.setVaL(labResult.getVaL());
        record.setVaR(labResult.getVaR());
        record.setBcvaL(labResult.getBcvaL());
        record.setBcvaR(labResult.getBcvaR());
        record.setSphL(labResult.getSphL());
        record.setSphR(labResult.getSphR());
        record.setCylL(labResult.getCylL());
        record.setCylR(labResult.getCylR());
        record.setAxisL(labResult.getAxisL());
        record.setAxisR(labResult.getAxisR());
        record.setIopL(labResult.getIopL());
        record.setIopR(labResult.getIopR());
        record.setLabImageUrl(labResult.getImageUrls());

        medicalRecordRepository.save(record);

        labOrder.setStatus(LabOrderStatus.APPROVED);
        LabOrder saved = labOrderRepository.save(labOrder);

        return toOrderResponse(saved);
    }

    /**
     * Yêu cầu thực hiện xét nghiệm lại.
     *
     * Quy trình:
     * 1. Chuyển phiếu cũ sang REJECTED
     * 2. Lưu lý do từ chối
     * 3. Tạo phiếu xét nghiệm mới (kế thừa thông tin từ phiếu cũ)
     * 4. Copy LabResult của phiếu cũ sang phiếu mới làm dữ liệu nháp
     * để kỹ thuật viên không phải nhập lại từ đầu
     *
     * Phiếu mới sẽ bắt đầu lại quy trình xét nghiệm từ trạng thái PENDING
     */
    @Override
    @Transactional
    public LabOrderResponse requestRetest(Long labOrderId, Long doctorId, LabOrderRequest request) {
        // Validate & reject phiếu cũ
        LabOrder previousOrder = labOrderRepository.findById(labOrderId)
                .orElseThrow(() -> new RuntimeException("LabOrder not found: " + labOrderId));

        if (previousOrder.getDoctor() == null || !previousOrder.getDoctor().getId().equals(doctorId)) {
            throw new AccessDeniedException("You are not authorized");
        }
        if (previousOrder.getStatus() != LabOrderStatus.SUBMITTED) {
            throw new IllegalStateException("Can request a retest for a SUBMITTED Order only");
        }

        previousOrder.setStatus(LabOrderStatus.REJECTED);
        previousOrder.setRejectionReason(request.getRejectionReason());
        previousOrder.setRejectedAt(LocalDateTime.now());
        labOrderRepository.save(previousOrder);

        // Tạo LabOrder mới kế thừa từ phiếu cũ
        LabOrder newOrder = LabOrder.builder()
                .medicalRecord(previousOrder.getMedicalRecord())
                .doctor(previousOrder.getDoctor())
                .labTechnician(previousOrder.getLabTechnician())
                .priority(previousOrder.getPriority())
                .notes(previousOrder.getNotes())
                .build();

        LabOrder savedOrder = labOrderRepository.save(newOrder);

        // Copy LabResult của phiếu cũ sang phiếu mới
        // Kỹ thuật viên sẽ thấy dữ liệu đã nhập trước đó làm điểm xuất phát,
        // chỉ cần chỉnh sửa những chỉ số bị bác sĩ yêu cầu đo lại
        labResultRepository.findTopByLabOrderIdOrderByIdDesc(labOrderId).ifPresent(previousResult -> {
            LabResult copiedResult = LabResult.builder()
                    .labOrder(savedOrder)
                    // ── Thông số thị lực ──
                    .vaL(previousResult.getVaL())
                    .vaR(previousResult.getVaR())
                    .bcvaL(previousResult.getBcvaL())
                    .bcvaR(previousResult.getBcvaR())
                    // ── Thông số khúc xạ & nhãn áp mắt trái ──
                    .sphL(previousResult.getSphL())
                    .cylL(previousResult.getCylL())
                    .axisL(previousResult.getAxisL())
                    .iopL(previousResult.getIopL())
                    // ── Thông số khúc xạ & nhãn áp mắt phải ──
                    .sphR(previousResult.getSphR())
                    .cylR(previousResult.getCylR())
                    .axisR(previousResult.getAxisR())
                    .iopR(previousResult.getIopR())
                    // ── Ảnh & ghi chú ──
                    // imageUrls được copy để kỹ thuật viên tham khảo ảnh cũ;
                    // họ có thể xoá / thêm ảnh mới khi submit lại.
                    .imageUrls(previousResult.getImageUrls())
                    // doctorNotes của phiếu cũ KHÔNG copy — đây là ghi chú bác sĩ viết
                    // sau khi duyệt, không thuộc về lần xét nghiệm mới.
                    .doctorNotes(null)
                    // ── Người thực hiện ──
                    .labTechnician(previousResult.getLabTechnician())
                    .doctor(savedOrder.getDoctor())
                    // reviewedAt để null — chưa có bác sĩ duyệt lần này
                    .build();

            labResultRepository.save(copiedResult);
        });

        return toOrderResponse(savedOrder);
    }

    private LabOrderResponse toOrderResponse(LabOrder labOrder) {
        String doctorFullName = null;
        if (labOrder.getDoctor() != null) {
            // Nếu id liên kết thực chất là user_id
            Doctor realDoctor = doctorRepository.findByUserId(labOrder.getDoctor().getId()).orElse(null);
            if (realDoctor != null) {
                doctorFullName = realDoctor.getFullName();
            } else {
                doctorFullName = labOrder.getDoctor().getFullName();
            }
        }

        return LabOrderResponse.builder()
                .id(labOrder.getId())
                .medicalRecordId(labOrder.getMedicalRecord().getId())
                .doctorFullName(doctorFullName)
                .labTechnicianFullName(
                        labOrder.getLabTechnician() != null ? labOrder.getLabTechnician().getFullName() : null)
                .patientFullName(labOrder.getMedicalRecord().getPatient() != null
                        ? labOrder.getMedicalRecord().getPatient().getFullName()
                        : null)
                .patientPhone(labOrder.getMedicalRecord().getPatient() != null
                        ? labOrder.getMedicalRecord().getPatient().getPhone()
                        : null)
                .serviceName(labOrder.getMedicalRecord().getAppointment() != null
                        && labOrder.getMedicalRecord().getAppointment().getClinicService() != null
                                ? labOrder.getMedicalRecord().getAppointment().getClinicService().getServiceName()
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
                .imageUrls(fromJson(labResult.getImageUrls()))
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

    /**
     * Bắt đầu thực hiện xét nghiệm
     */
    @Override
    @Transactional
    public LabOrderResponse startLabOrder(Long labOrderId, Long labTechnicianId) {
        LabOrder labOrder = labOrderRepository.findById(labOrderId)
                .orElseThrow(() -> new RuntimeException("LabOrder not found: " + labOrderId));

        if (labOrder.getStatus() != LabOrderStatus.PENDING) {
            throw new IllegalStateException("Only PENDING lab orders can be started");
        }

        if (labOrder.getLabTechnician() == null) {
            labOrder.setLabTechnician(labTechnicianRepository.getReferenceById(labTechnicianId));
        } else if (!labOrder.getLabTechnician().getId().equals(labTechnicianId)) {
            throw new AccessDeniedException("You are not authorized to start this lab order");
        }

        labOrder.setStatus(LabOrderStatus.IN_PROGRESS);
        LabOrder saved = labOrderRepository.save(labOrder);
        return toOrderResponse(saved);
    }

    @Override
    @Transactional
    public List<LabOrderResponse> getLabOrdersForDoctor(Long doctorId) {
        return labOrderRepository.findByDoctorIdOrderByPriorityAndCreatedAt(doctorId)
                .stream()
                .map(this::toOrderResponse)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional
    public List<LabTechnicianResponse> getActiveLabTechnicians() {
        return labTechnicianRepository.findByStatus("ACTIVE")
                .stream()
                .map(lt -> LabTechnicianResponse.builder()
                        .id(lt.getId())
                        .fullName(lt.getFullName())
                        .specialization(lt.getSpecialization())
                        .email(lt.getEmail())
                        .build())
                .collect(Collectors.toList());
    }

    /**
     * Lưu nháp kết quả xét nghiệm
     *
     * Mục đích:
     * Cho phép kỹ thuật viên lưu kết quả tạm thời
     * trong quá trình thực hiện xét nghiệm
     */
    @Override
    @Transactional
    public LabOrderResponse saveDraft(Long labOrderId, LabResultRequest request, Long labTechnicianId) {
        LabOrder labOrder = labOrderRepository.findById(labOrderId)
                .orElseThrow(() -> new RuntimeException("LabOrder not found: " + labOrderId));

        if (labOrder.getLabTechnician() == null || !labOrder.getLabTechnician().getId().equals(labTechnicianId)) {
            throw new AccessDeniedException("You are not authorized");
        }

        // Chỉ cho phép lưu nháp khi đang IN_PROGRESS
        if (labOrder.getStatus() != LabOrderStatus.IN_PROGRESS) {
            throw new IllegalStateException("Can only save draft for an IN_PROGRESS LabOrder");
        }

        // Tìm LabResult hiện có hoặc tạo mới
        Optional<LabResult> existing = labResultRepository.findTopByLabOrderIdOrderByIdDesc(labOrderId);
        LabResult labResult = existing.orElse(LabResult.builder()
                .labOrder(labOrder)
                .labTechnician(labTechnicianRepository.getReferenceById(labTechnicianId))
                .doctor(labOrder.getDoctor())
                .build());

        // Cập nhật các trường — KHÔNG đổi status của LabOrder
        labResult.setVaL(request.getVaL());
        labResult.setVaR(request.getVaR());
        labResult.setBcvaL(request.getBcvaL());
        labResult.setBcvaR(request.getBcvaR());
        labResult.setSphL(request.getSphL());
        labResult.setSphR(request.getSphR());
        labResult.setCylL(request.getCylL());
        labResult.setCylR(request.getCylR());
        labResult.setAxisL(request.getAxisL());
        labResult.setAxisR(request.getAxisR());
        labResult.setIopL(request.getIopL());
        labResult.setIopR(request.getIopR());
        labResult.setImageUrls(toJson(request.getImageUrls()));
        labResult.setDoctorNotes(request.getDoctorNotes());

        labResultRepository.save(labResult);

        // Status LabOrder giữ nguyên IN_PROGRESS
        return toOrderResponse(labOrder);
    }

    /**
     * Chuyển danh sách URL ảnh thành JSON string
     * để lưu xuống database
     */
    private String toJson(List<String> urls) {
        if (urls == null || urls.isEmpty())
            return null;
        try {
            return objectMapper.writeValueAsString(urls);
        } catch (Exception e) {
            return null;
        }
    }

    /**
     * Chuyển JSON string thành danh sách URL ảnh
     */
    private List<String> fromJson(String json) {
        if (json == null || json.isBlank())
            return List.of();
        try {
            return objectMapper.readValue(json, new TypeReference<List<String>>() {
            });
        } catch (Exception e) {
            return List.of();
        }
    }
}
