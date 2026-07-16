package com.ecms.service.impl;

import com.ecms.dto.request.EyeglassOrderRequest;
import com.ecms.dto.response.EyeglassOrderResponse;
import com.ecms.entity.*;
import com.ecms.exception.ResourceNotFoundException;
import com.ecms.repository.*;
import com.ecms.service.EyeglassOrderService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class EyeglassOrderServiceImpl implements EyeglassOrderService {

    private final EyeglassOrderRepository eyeglassOrderRepository;
    private final EyeglassPrescriptionRepository prescriptionRepository;
    private final EyeglassFrameRepository frameRepository;
    private final EyeglassCoatingRepository coatingRepository;
    private final StaffRepository staffRepository;
    private final UserRepository userRepository;
    private final InvoiceRepository invoiceRepository;

    @Override
    @Transactional
    public EyeglassOrderResponse createOrder(EyeglassOrderRequest request) {
        EyeglassPrescription prescription = prescriptionRepository.findById(request.getPrescriptionId())
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy đơn kính"));

        Patient patient = prescription.getPatient();
        BigDecimal totalAmount = BigDecimal.ZERO;

        // Giá tròng kính
        if (prescription.getLensType() != null) {
            totalAmount = totalAmount.add(prescription.getLensType().getBasePrice());
        }

        EyeglassFrame frame = null;
        if (request.getFrameId() != null) {
            frame = frameRepository.findById(request.getFrameId())
                    .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy gọng kính"));
            totalAmount = totalAmount.add(frame.getPrice());
        }

        Set<EyeglassCoating> coatings = new HashSet<>();
        if (request.getCoatingIds() != null && !request.getCoatingIds().isEmpty()) {
            List<EyeglassCoating> coatingList = coatingRepository.findAllById(request.getCoatingIds());
            coatings.addAll(coatingList);
            for (EyeglassCoating c : coatingList) {
                totalAmount = totalAmount.add(c.getPrice());
            }
        }

        EyeglassOrder order = EyeglassOrder.builder()
                .patient(patient)
                .prescription(prescription)
                .frame(frame)
                .coatings(coatings)
                .status("PENDING")
                .totalAmount(totalAmount)
                .build();

        order = eyeglassOrderRepository.save(order);

        // Sinh InvoiceItem cho đơn kính
        Invoice invoice = invoiceRepository.findByAppointmentId(prescription.getMedicalRecord().getAppointment().getId()).orElse(null);
        if (invoice != null) {
            InvoiceItem item = InvoiceItem.builder()
                    .invoice(invoice)
                    .itemType("GLASSES")
                    .refId(order.getId())
                    .description("Đơn đặt kính y tế (Tròng + Gọng)")
                    .quantity(1)
                    .unitPrice(totalAmount)
                    .subTotal(totalAmount)
                    .status("ACTIVE")
                    .build();
            
            invoice.getItems().add(item);
            
            // Cập nhật lại tổng tiền hoá đơn
            invoice.setSubTotal(invoice.getSubTotal().add(totalAmount));
            invoice.setTotalAmount(invoice.getTotalAmount().add(totalAmount));
            
            invoiceRepository.save(invoice);
        }

        return toResponse(order);
    }

    @Override
    @Transactional(readOnly = true)
    public EyeglassOrderResponse getOrderById(Long id) {
        return eyeglassOrderRepository.findById(id)
                .map(this::toResponse)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy đơn đặt kính"));
    }

    @Override
    @Transactional(readOnly = true)
    public List<EyeglassOrderResponse> getOrdersByPatient(Long patientId) {
        return eyeglassOrderRepository.findByPatientIdOrderByCreatedAtDesc(patientId).stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public List<EyeglassOrderResponse> getPendingOrders() {
        return eyeglassOrderRepository.findByStatus("PENDING").stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional
    public EyeglassOrderResponse dispenseOrder(Long id, String staffEmail) {
        EyeglassOrder order = eyeglassOrderRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy đơn đặt kính"));

        User user = userRepository.findByEmail(staffEmail)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy user"));
                
        Staff staff = staffRepository.findByUserId(user.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Tài khoản không phải là nhân viên"));

        if ("DISPENSED".equals(order.getStatus())) {
            throw new IllegalStateException("Đơn này đã được giao rồi");
        }

        order.setStatus("DISPENSED");
        order.setDispensedBy(staff);
        order.setDispensedAt(LocalDateTime.now());

        return toResponse(eyeglassOrderRepository.save(order));
    }

    private EyeglassOrderResponse toResponse(EyeglassOrder order) {
        List<String> coatingNames = order.getCoatings() != null ?
                order.getCoatings().stream().map(EyeglassCoating::getName).collect(Collectors.toList()) : null;

        return EyeglassOrderResponse.builder()
                .id(order.getId())
                .patientId(order.getPatient().getId())
                .patientName(order.getPatient().getFullName())
                .prescriptionId(order.getPrescription().getId())
                .frameId(order.getFrame() != null ? order.getFrame().getId() : null)
                .frameName(order.getFrame() != null ? order.getFrame().getName() : null)
                .status(order.getStatus())
                .totalAmount(order.getTotalAmount())
                .dispensedBy(order.getDispensedBy() != null ? order.getDispensedBy().getId() : null)
                .dispensedByName(order.getDispensedBy() != null ? order.getDispensedBy().getFullName() : null)
                .dispensedAt(order.getDispensedAt())
                .coatings(coatingNames)
                .createdAt(order.getCreatedAt())
                .build();
    }
}
