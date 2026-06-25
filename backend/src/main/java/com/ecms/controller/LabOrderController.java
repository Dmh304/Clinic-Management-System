/**
 * Author: TuanTD
 * 
 * Controller quản lý toàn bộ quy trình xét nghiệm
 * 
 * Chức năng chính:
 * - Bác sĩ tạo phiếu chỉ định xét nghiệm
 * - Kỹ thuật viên xem hàng đợi xét nghiệm
 * - Kỹ thuật viên bắt đầu thực hiện xét nghiệm
 * - Kỹ thuật viên lưu nháp hoặc gửi kết quả xét nghiệm
 * - Bác sĩ duyệt kết quả xét nghiệm
 * - Bác sĩ yêu cầu xét nghiệm lại
 * - Bệnh nhân, bác sĩ hoặc kỹ thuật viên xem kết quả xét nghiệm
 */

package com.ecms.controller;

import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.ecms.dto.request.LabOrderRequest;
import com.ecms.dto.request.LabResultRequest;
import com.ecms.dto.response.ApiResponse;
import com.ecms.dto.response.LabOrderResponse;
import com.ecms.dto.response.LabResultResponse;
import com.ecms.dto.response.LabTechnicianResponse;
import com.ecms.entity.Doctor;
import com.ecms.entity.LabTechnician;
import com.ecms.entity.Patient;
import com.ecms.repository.DoctorRepository;
import com.ecms.repository.LabTechnicianRepository;
import com.ecms.repository.PatientRepository;
import com.ecms.service.LabOrderService;
import lombok.RequiredArgsConstructor;
import java.util.List;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.PutMapping;

@RestController
@RequestMapping("/api/v1/lab")
@RequiredArgsConstructor
public class LabOrderController {

    /* Service xử lý nghiệp vụ xét nghiệm */
    private final LabOrderService labOrderService;

    /* Repository dùng để truy xuất thông tin bác sĩ */
    private final DoctorRepository doctorRepository;

    /* Repository dùng để truy xuất thông tin kỹ thuật viên xét nghiệm */
    private final LabTechnicianRepository labTechnicianRepository;

    /* Repository dùng để truy xuất thông tin bệnh nhân */
    private final PatientRepository patientRepository;

    /**
     * Tạo phiếu chỉ định xét nghiệm mới.
     *
     * Quy trình:
     * 1. Lấy thông tin tài khoản đang đăng nhập
     * 2. Xác định ID bác sĩ từ email đăng nhập
     * 3. Gọi service tạo phiếu xét nghiệm
     */
    @PostMapping
    public ResponseEntity<ApiResponse<LabOrderResponse>> createLabOrder(
            @RequestBody LabOrderRequest request,
            @AuthenticationPrincipal UserDetails userDetails) {

        Long doctorId = resolveDoctorId(userDetails);

        return ResponseEntity.ok(
                ApiResponse.success(
                        labOrderService.createLabOrder(request, doctorId)));
    }

    /**
     * Lấy danh sách các phiếu xét nghiệm đang chờ xử lý
     * dành cho kỹ thuật viên xét nghiệm
     */
    @GetMapping("/queue")
    public ResponseEntity<ApiResponse<List<LabOrderResponse>>> getLabOrderQueue(
            @AuthenticationPrincipal UserDetails userDetails) {

        Long labTechnicianId = resolveLabTechnicianId(userDetails);

        return ResponseEntity.ok(
                ApiResponse.success(
                        labOrderService.getLabQueue(labTechnicianId)));
    }

    /**
     * Đánh dấu bắt đầu thực hiện xét nghiệm
     *
     * Khi được gọi:
     * - Phiếu xét nghiệm chuyển sang trạng thái IN_PROGRESS
     * - Ghi nhận kỹ thuật viên đang xử lý
     */
    @PutMapping("/{id}/start")
    public ResponseEntity<ApiResponse<LabOrderResponse>> startLabOrder(
            @PathVariable Long id,
            @AuthenticationPrincipal UserDetails userDetails) {

        Long labTechnicianId = resolveLabTechnicianId(userDetails);

        return ResponseEntity.ok(
                ApiResponse.success(
                        labOrderService.startLabOrder(id, labTechnicianId)));
    }

    /**
     * Gửi kết quả xét nghiệm chính thức
     *
     * Sau khi gửi:
     * - Không còn là bản nháp
     * - Chờ bác sĩ duyệt kết quả
     */
    @PutMapping("/{id}/result")
    public ResponseEntity<ApiResponse<LabOrderResponse>> submitResult(
            @PathVariable Long id,
            @RequestBody LabResultRequest request,
            @AuthenticationPrincipal UserDetails userDetails) {

        Long labTechnicianId = resolveLabTechnicianId(userDetails);

        return ResponseEntity.ok(
                ApiResponse.success(
                        labOrderService.submitLabResult(id, request, labTechnicianId)));
    }

    /**
     * Lấy toàn bộ phiếu xét nghiệm thuộc một hồ sơ bệnh án
     */
    @GetMapping("/emr/{medicalRecordId}")
    public ResponseEntity<ApiResponse<List<LabOrderResponse>>> getLabOrdersForMedicalRecord(
            @PathVariable Long medicalRecordId) {

        return ResponseEntity.ok(
                ApiResponse.success(
                        labOrderService.getLabOrdersForMedicalRecord(medicalRecordId)));
    }

    /**
     * Xem kết quả xét nghiệm
     */
    @GetMapping("/{id}/results")
    public ResponseEntity<ApiResponse<LabResultResponse>> getLabResults(
            @PathVariable Long id,
            @AuthenticationPrincipal UserDetails userDetails) {

        Long currentUserId = resolveDoctorId(userDetails);
        String role = "DOCTOR";

        // Nếu không phải bác sĩ thì kiểm tra kỹ thuật viên
        if (currentUserId == null) {
            currentUserId = resolveLabTechnicianId(userDetails);
            role = "LAB_TECHNICIAN";
        }

        // Nếu vẫn không tìm thấy thì kiểm tra bệnh nhân
        if (currentUserId == null) {
            currentUserId = resolvePatientId(userDetails);
            role = "PATIENT";
        }

        return ResponseEntity.ok(
                ApiResponse.success(
                        labOrderService.getLabResults(id, currentUserId, role)));
    }

    /**
     * Bác sĩ duyệt kết quả xét nghiệm
     *
     * Sau khi duyệt:
     * - Kết quả được xác nhận chính thức
     * - Có thể sử dụng trong chẩn đoán và điều trị
     */
    @PutMapping("/{id}/approve")
    public ResponseEntity<ApiResponse<LabOrderResponse>> approveLabResult(
            @PathVariable Long id,
            @AuthenticationPrincipal UserDetails userDetails) {

        Long doctorId = resolveDoctorId(userDetails);

        return ResponseEntity.ok(
                ApiResponse.success(
                        labOrderService.approveLabResult(id, doctorId)));
    }

    /**
     * Yêu cầu xét nghiệm lại
     */
    @PutMapping("/{id}/retest")
    public ResponseEntity<ApiResponse<LabOrderResponse>> requestRetest(
            @PathVariable Long id,
            @RequestBody LabOrderRequest request,
            @AuthenticationPrincipal UserDetails userDetails) {

        Long doctorId = resolveDoctorId(userDetails);

        return ResponseEntity.ok(
                ApiResponse.success(
                        labOrderService.requestRetest(id, doctorId, request)));
    }

    /**
     * Lấy danh sách kỹ thuật viên xét nghiệm đang hoạt động
     *
     * Chỉ bác sĩ mới được phép truy cập endpoint này
     */
    @GetMapping("/technicians")
    @PreAuthorize("hasAnyRole('DOCTOR')")
    public ResponseEntity<ApiResponse<List<LabTechnicianResponse>>> getActiveLabTechnicians() {

        return ResponseEntity.ok(
                ApiResponse.success(
                        labOrderService.getActiveLabTechnicians()));
    }

    /**
     * Lấy tất cả phiếu xét nghiệm do bác sĩ hiện tại tạo
     */
    @GetMapping("/doctor")
    public ResponseEntity<ApiResponse<List<LabOrderResponse>>> getLabOrdersForDoctor(
            @AuthenticationPrincipal UserDetails userDetails) {

        Long doctorId = resolveDoctorId(userDetails);

        return ResponseEntity.ok(
                ApiResponse.success(
                        labOrderService.getLabOrdersForDoctor(doctorId)));
    }

    /**
     * Lưu kết quả xét nghiệm dưới dạng bản nháp
     *
     * Dùng khi kỹ thuật viên chưa hoàn tất nhập dữ liệu
     */
    @PutMapping("/{id}/draft")
    public ResponseEntity<ApiResponse<LabOrderResponse>> saveDraft(
            @PathVariable Long id,
            @RequestBody LabResultRequest request,
            @AuthenticationPrincipal UserDetails userDetails) {

        Long labTechnicianId = resolveLabTechnicianId(userDetails);

        return ResponseEntity.ok(
                ApiResponse.success(
                        labOrderService.saveDraft(id, request, labTechnicianId)));
    }

    /**
     * Tìm ID bác sĩ từ email của tài khoản đăng nhập
     */
    private Long resolveDoctorId(UserDetails userDetails) {
        if (userDetails == null) {
            return null;
        }

        return doctorRepository.findByEmail(userDetails.getUsername())
                .map(Doctor::getId)
                .orElse(null);
    }

    /**
     * Tìm ID kỹ thuật viên xét nghiệm từ email đăng nhập
     */
    private Long resolveLabTechnicianId(UserDetails userDetails) {
        if (userDetails == null) {
            return null;
        }

        return labTechnicianRepository.findByEmail(userDetails.getUsername())
                .map(LabTechnician::getId)
                .orElse(null);
    }

    /**
     * Tìm ID bệnh nhân từ email đăng nhập
     */
    private Long resolvePatientId(UserDetails userDetails) {
        if (userDetails == null) {
            return null;
        }

        return patientRepository.findByEmail(userDetails.getUsername())
                .map(Patient::getId)
                .orElse(null);
    }
}