// DucTKH
// Service xử lý logic nghiệp vụ cho Đơn thuốc (tạo đơn, phát thuốc, lấy danh sách).
package com.ecms.service.impl;

import com.ecms.dto.request.PrescriptionItemRequest;
import com.ecms.dto.request.PrescriptionRequest;
import com.ecms.dto.request.DispenseRequest;
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
import java.util.Map;
import java.util.HashMap;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class PrescriptionServiceImpl implements PrescriptionService {

    private final PrescriptionRepository prescriptionRepository;
    private final MedicineRepository medicineRepository;
    private final MedicalRecordRepository medicalRecordRepository;
    private final DoctorRepository doctorRepository;
    private final InvoiceRepository invoiceRepository;
    private final InvoiceItemRepository invoiceItemRepository;

    // Tạo mới một đơn thuốc từ yêu cầu của bác sĩ
    @Override
    @Transactional
    public PrescriptionResponse createPrescription(PrescriptionRequest request, String doctorEmail) {
        MedicalRecord record = medicalRecordRepository.findById(request.getMedicalRecordId())
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy bệnh án"));

        Doctor doctor = doctorRepository.findByEmail(doctorEmail)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy bác sĩ"));

        // Kiểm tra quyền: Bác sĩ kê đơn phải đúng là bác sĩ phụ trách bệnh án
        if (!record.getDoctor().getId().equals(doctor.getId())) {
            throw new IllegalStateException("Bạn không có quyền kê đơn cho bệnh án này");
        }

        // Xóa đơn thuốc cũ (nếu đang PENDING) hoặc chặn lại nếu đã phát thuốc
        List<Prescription> existingPrescriptions = prescriptionRepository.findByMedicalRecordId(record.getId());
        for (Prescription existing : existingPrescriptions) {
            if (existing.getStatus() != PrescriptionStatus.PENDING) {
                throw new IllegalStateException("Đơn thuốc đã được xuất hoặc phát, không thể chỉnh sửa!");
            }
            prescriptionRepository.delete(existing);
        }
        prescriptionRepository.flush(); // Đảm bảo đã xóa trước khi tạo mới

        Prescription prescription = Prescription.builder()
                .medicalRecord(record)
                .doctor(doctor)
                .patient(record.getPatient())
                .notes(request.getNotes())
                .status(PrescriptionStatus.PENDING)
                .items(new ArrayList<>())
                .build();

        // Duyệt qua danh sách từng loại thuốc trong yêu cầu để thêm vào đơn
        for (PrescriptionItemRequest itemReq : request.getItems()) {
            Medicine medicine = medicineRepository.findById(itemReq.getMedicineId())
                    .orElseThrow(
                            () -> new ResourceNotFoundException("Không tìm thấy thuốc: " + itemReq.getMedicineId()));

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

    // Lấy danh sách các đơn thuốc của một bệnh nhân cụ thể
    @Override
    @Transactional(readOnly = true)
    public List<PrescriptionResponse> getPatientPrescriptions(Long patientId) {
        return prescriptionRepository.findByPatientIdOrderByCreatedAtDesc(patientId).stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public List<PrescriptionResponse> getByMedicalRecordId(Long medicalRecordId) {
        return prescriptionRepository.findByMedicalRecordId(medicalRecordId).stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    // Lấy các đơn thuốc đang chờ (PENDING) để dược sĩ phát thuốc
    @Override
    @Transactional(readOnly = true)
    public List<PrescriptionResponse> getPendingPrescriptions() {
        return prescriptionRepository.findByStatusOrderByCreatedAtAsc(PrescriptionStatus.PENDING).stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    // Xử lý logic khi dược sĩ ấn nút "Phát thuốc"
    @Override
    @Transactional
    public PrescriptionResponse dispensePrescription(Long id, DispenseRequest request) {
        // DucTKH: Tương tác DB - Lấy đơn thuốc theo id
        Prescription p = prescriptionRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy đơn thuốc"));

        // DucTKH: Điều kiện - Kiểm tra trạng thái, chỉ cho phép phát nếu đơn đang chờ
        // (PENDING)
        if (p.getStatus() != PrescriptionStatus.PENDING) {
            throw new IllegalStateException("Chỉ có thể phát đơn thuốc ở trạng thái PENDING");
        }

        // KHÔNG ghi đè số lượng gốc của bác sĩ. Dược sĩ chỉ cập nhật hóa đơn.
        Map<Long, Integer> actualQuantityMap = new HashMap<>();
        // DucTKH: Điều kiện - Kiểm tra request có danh sách chi tiết thuốc không
        if (request != null && request.getItems() != null) {
            // DucTKH: Vòng lặp - Duyệt qua từng chi tiết thuốc được dược sĩ phát để lấy số
            // lượng thực tế
            for (var reqItem : request.getItems()) {
                actualQuantityMap.put(reqItem.getPrescriptionItemId(), reqItem.getActualQuantity());
            }
        }

        p.setStatus(PrescriptionStatus.DISPENSED);
        // DucTKH: Tương tác DB - Cập nhật trạng thái đơn thuốc thành Đã phát
        prescriptionRepository.save(p);

        // Sinh hóa đơn (Invoice) cho tiền thuốc
        BigDecimal totalAmount = BigDecimal.ZERO;
        List<InvoiceItem> invoiceItems = new ArrayList<>();

        Invoice invoice = Invoice.builder()
                .patient(p.getPatient())
                .appointment(p.getMedicalRecord().getAppointment())
                .paymentStatus("UNPAID")
                .status("DRAFT")
                .subTotal(BigDecimal.ZERO)
                .discountAmount(BigDecimal.ZERO)
                .tax(BigDecimal.ZERO)
                .totalAmount(BigDecimal.ZERO)
                .build();

        // DucTKH: Tương tác DB - Lưu trước bản ghi Invoice để có ID phục vụ cho
        // InvoiceItem
        invoice = invoiceRepository.save(invoice);

        // DucTKH: Vòng lặp - Xây dựng các chi tiết hóa đơn (InvoiceItem) dựa trên từng
        // thuốc trong đơn
        for (PrescriptionItem item : p.getItems()) {
            Integer dispensedQuantity = actualQuantityMap.getOrDefault(item.getId(), item.getQuantity());
            BigDecimal unitPrice = item.getUnitPrice() != null ? item.getUnitPrice() : BigDecimal.ZERO;
            BigDecimal itemTotal = unitPrice.multiply(BigDecimal.valueOf(dispensedQuantity));
            totalAmount = totalAmount.add(itemTotal); // DucTKH: Cộng dồn tổng tiền hóa đơn

            InvoiceItem invoiceItem = InvoiceItem.builder()
                    .invoice(invoice)
                    .itemType("MEDICINE")
                    .description(item.getMedicine().getName() + " (" + item.getMedicine().getDosageForm() + ")")
                    .quantity(dispensedQuantity)
                    .unitPrice(unitPrice)
                    .subTotal(itemTotal)
                    .refId(item.getId()) // Link với PrescriptionItem ID
                    .status("ACTIVE")
                    .build();
            invoiceItems.add(invoiceItem);
        }

        invoice.setSubTotal(totalAmount);
        invoice.setTotalAmount(totalAmount);
        // DucTKH: Tương tác DB - Cập nhật lại tổng tiền cho Invoice
        invoiceRepository.save(invoice);
        // DucTKH: Tương tác DB - Lưu hàng loạt các chi tiết hóa đơn
        invoiceItemRepository.saveAll(invoiceItems);

        return toResponse(p);
    }

    // Xử lý logic khi dược sĩ bỏ qua (hủy) không phát đơn thuốc này
    @Override
    @Transactional
    public PrescriptionResponse skipPrescription(Long id) {
        // DucTKH: Tương tác DB - Lấy đơn thuốc theo id
        Prescription p = prescriptionRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy đơn thuốc"));

        // DucTKH: Điều kiện - Kiểm tra trạng thái giống như khi phát thuốc
        if (p.getStatus() != PrescriptionStatus.PENDING) {
            throw new IllegalStateException("Chỉ có thể hủy đơn thuốc ở trạng thái PENDING");
        }

        p.setStatus(PrescriptionStatus.SKIPPED);
        // DucTKH: Tương tác DB - Lưu trạng thái Hủy đơn
        return toResponse(prescriptionRepository.save(p));
    }

    // Hàm bổ trợ chuyển đổi từ Prescription sang PrescriptionResponse
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

    // Hàm bổ trợ chuyển đổi từ PrescriptionItem sang PrescriptionItemResponse
    private PrescriptionItemResponse toItemResponse(PrescriptionItem i) {
        Integer actualQuantity = null;
        BigDecimal total = BigDecimal.ZERO;

        // DucTKH: Điều kiện - Nếu đơn thuốc đã xuất, lấy số lượng thực tế từ Hóa đơn
        if (i.getPrescription().getStatus() == PrescriptionStatus.DISPENSED) {
            // DucTKH: Tương tác DB - Tìm chi tiết hóa đơn dựa vào reference ID (id của chi
            // tiết đơn thuốc)
            Optional<InvoiceItem> invoiceItemOpt = invoiceItemRepository.findFirstByRefIdAndItemType(i.getId(), "MEDICINE");
            // DucTKH: Điều kiện - Nếu tìm thấy chi tiết hóa đơn
            if (invoiceItemOpt.isPresent()) {
                actualQuantity = invoiceItemOpt.get().getQuantity();
            }
        }

        Integer displayQuantity = actualQuantity != null ? actualQuantity : i.getQuantity();
        // DucTKH: Điều kiện - Nếu có đơn giá, tính tổng tiền dựa trên số lượng hiển thị
        if (i.getUnitPrice() != null) {
            total = i.getUnitPrice().multiply(new BigDecimal(displayQuantity));
        }

        return PrescriptionItemResponse.builder()
                .id(i.getId())
                .medicineId(i.getMedicine().getId())
                .medicineName(i.getMedicine().getName())
                .dosageForm(i.getMedicine().getDosageForm())
                .unit(i.getMedicine().getUnit())
                .quantity(i.getQuantity())
                .actualQuantity(actualQuantity)
                .dosage(i.getDosage())
                .frequency(i.getFrequency())
                .duration(i.getDuration())
                .instructions(i.getInstructions())
                .unitPrice(i.getUnitPrice())
                .totalPrice(total)
                .build();
    }

    // Xóa đơn thuốc (chỉ xóa khi đang PENDING)
    @Override
    @Transactional
    public void deletePrescription(Long id) {
        // DucTKH: Tương tác DB - Lấy đơn thuốc theo id
        Prescription p = prescriptionRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy đơn thuốc"));

        // DucTKH: Điều kiện - Chặn thao tác xóa nếu đơn thuốc đã được dược sĩ xử lý
        if (p.getStatus() != PrescriptionStatus.PENDING) {
            throw new IllegalStateException("Đơn thuốc đã được xuất hoặc phát, không thể xóa!");
        }

        // DucTKH: Tương tác DB - Thực hiện xóa đơn thuốc khỏi cơ sở dữ liệu
        prescriptionRepository.delete(p);
    }
}
