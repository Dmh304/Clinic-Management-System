//Author: DucTKH - HE204463
//Created: 2026-07-20
//Last Update: 2026-07-25

package com.ecms.service.impl;

import com.ecms.dto.request.EyeglassOrderRequest;
import com.ecms.dto.response.EyeglassOrderResponse;
import com.ecms.entity.*;
import com.ecms.exception.ResourceNotFoundException;
import com.ecms.repository.*;
import com.ecms.service.EyeglassOrderService;
import com.ecms.service.NotificationService;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.security.core.Authentication;

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
    private final UserRepository userRepository;
    private final InvoiceRepository invoiceRepository;
    private final NotificationService notificationService;

    // Chức năng: Tạo mới đơn đặt kính (UC-42)
    @Override
    @Transactional
    public EyeglassOrderResponse createOrder(EyeglassOrderRequest request, Authentication authentication) {
        // Kiểm tra quyền: Bệnh nhân tự đặt thì chỉ được đặt 1 lần cho 1 toa kính. 
        // Lễ tân/Admin có thể tạo nhiều đơn (mua nhiều kính) trên cùng 1 toa.
        boolean isStaff = authentication != null && authentication.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals("ROLE_RECEPTIONIST") || a.getAuthority().equals("ROLE_ADMIN"));
                
        if (!isStaff && eyeglassOrderRepository.existsByPrescriptionIdAndStatusNot(request.getPrescriptionId(), EyeglassOrderStatus.CANCELLED)) {
            throw new IllegalStateException("Toa kính này đã được đặt hàng.");
        }

        EyeglassPrescription prescription = prescriptionRepository.findById(request.getPrescriptionId())
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy đơn kính"));

        Patient patient = prescription.getPatient();
        BigDecimal totalAmount = BigDecimal.ZERO;

        // Giá tròng kính
        if (prescription.getLensType() != null) {
            totalAmount = totalAmount.add(prescription.getLensType().getBasePrice());
        }

        // Tính giá gọng kính
        EyeglassFrame frame = null;
        if (request.getFrameId() != null) {
            frame = frameRepository.findById(request.getFrameId())
                    .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy gọng kính"));
            totalAmount = totalAmount.add(frame.getPrice());
        }

        // Tính giá lớp phủ tròng kính
        Set<EyeglassCoating> coatings = new HashSet<>();
        if (request.getCoatingIds() != null && !request.getCoatingIds().isEmpty()) {
            List<EyeglassCoating> coatingList = coatingRepository.findAllById(request.getCoatingIds());
            coatings.addAll(coatingList);
            for (EyeglassCoating c : coatingList) {
                totalAmount = totalAmount.add(c.getPrice());
            }
        }

        // Cập nhật yêu cầu: Mọi đơn hàng (dù do bệnh nhân hay lễ tân tạo) đều phải vào trạng thái Chờ xác nhận (PENDING_CONFIRMATION).
        // Mục đích để lễ tân có thể xem lại, sửa đơn, và xác nhận thu tiền trước khi đẩy xuống xưởng.
        EyeglassOrderStatus initialStatus = EyeglassOrderStatus.PENDING_CONFIRMATION;

        EyeglassOrder order = EyeglassOrder.builder()
                .patient(patient)
                .prescription(prescription)
                .frame(frame)
                .coatings(coatings)
                .status(initialStatus)
                .totalAmount(totalAmount)
                .build();

        order = eyeglassOrderRepository.save(order);

        Long appointmentId = prescription.getMedicalRecord().getAppointment() != null
                ? prescription.getMedicalRecord().getAppointment().getId()
                : null;

        if (initialStatus == EyeglassOrderStatus.PENDING_CONFIRMATION) {
            // Trường hợp 1: Bệnh nhân tự đặt online -> Báo cho toàn bộ Lễ tân
            String message = String.format("Bệnh nhân %s vừa gửi yêu cầu đặt cắt một đơn kính mới",
                    patient.getFullName());
            notificationService.createForReceptionists(message, appointmentId);

        } else if (initialStatus == EyeglassOrderStatus.PENDING_LAB) {
            // Trường hợp 2: Lễ tân tạo đơn trực tiếp tại quầy -> Đơn chuyển thẳng xuống
            // xưởng
            // -> Báo luôn cho KTV
            String message = String.format("Lễ tân vừa tạo yêu cầu cắt đơn kính mới cho bệnh nhân %s",
                    patient.getFullName());
            notificationService.createForLabTechnicians(message, appointmentId);
        }

        // Sinh InvoiceItem cho đơn kính
        Invoice invoice = invoiceRepository
                .findByAppointmentId(prescription.getMedicalRecord().getAppointment().getId()).orElse(null);
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

    // Chức năng: Lấy thông tin chi tiết của một đơn đặt kính theo ID
    @Override
    @Transactional(readOnly = true)
    public EyeglassOrderResponse getOrderById(Long id) {
        return eyeglassOrderRepository.findById(id)
                .map(this::toResponse)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy đơn đặt kính"));
    }

    // Chức năng: Lấy danh sách đơn đặt kính của một bệnh nhân
    @Override
    @Transactional(readOnly = true)
    public List<EyeglassOrderResponse> getOrdersByPatient(Long patientId) {
        return eyeglassOrderRepository.findByPatientIdOrderByCreatedAtDesc(patientId).stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    // Chức năng: Lấy danh sách tất cả các đơn đặt kính (sắp xếp mới nhất lên đầu)
    @Override
    @Transactional(readOnly = true)
    public List<EyeglassOrderResponse> getAllOrders() {
        return eyeglassOrderRepository.findAllByOrderByCreatedAtDesc().stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    // Chức năng: Lấy danh sách các đơn đặt kính đang chờ xử lý (chờ xác nhận cọc hoặc chờ xưởng)
    @Override
    @Transactional(readOnly = true)
    public List<EyeglassOrderResponse> getPendingOrders() {
        return eyeglassOrderRepository.findAll().stream()
                .filter(o -> o.getStatus() == EyeglassOrderStatus.PENDING_CONFIRMATION
                        || o.getStatus() == EyeglassOrderStatus.PENDING_LAB)
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    // Chức năng: Lễ tân xác nhận đơn đặt kính sau khi thu tiền cọc (BR-28)
    @Override
    @Transactional
    public EyeglassOrderResponse confirmOrderOnline(Long id) {
        EyeglassOrder order = eyeglassOrderRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy đơn đặt kính"));
        // Điều kiện: Đơn phải đang ở trạng thái chờ xác nhận
        if (order.getStatus() != EyeglassOrderStatus.PENDING_CONFIRMATION) {
            throw new IllegalStateException("Đơn này không ở trạng thái chờ xác nhận");
        }

        // Cập nhật trạng thái sang chờ xưởng gia công
        order.setStatus(EyeglassOrderStatus.PENDING_LAB);
        // Đẩy đơn kính vào hàng đợi gia công
        com.ecms.entity.EyeglassPrescription p = order.getPrescription();
        p.setStatus(com.ecms.entity.EyeglassPrescriptionStatus.PENDING);
        prescriptionRepository.save(p);
        
        String patientName = order.getPatient().getFullName();
        String message = String.format("Lễ tân đã xác nhận yêu cầu cắt đơn kính cho bệnh nhân %s", patientName);

        Long appointmentId = order.getPrescription().getMedicalRecord().getAppointment() != null
                ? order.getPrescription().getMedicalRecord().getAppointment().getId()
                : null;

        notificationService.createForLabTechnicians(message, appointmentId);

        return toResponse(eyeglassOrderRepository.save(order));
    }
    
    // Chức năng: Cập nhật thông tin gọng kính, lớp phủ của đơn kính
    @Override
    @Transactional
    public EyeglassOrderResponse updateOrder(Long id, EyeglassOrderRequest request) {
        EyeglassOrder order = eyeglassOrderRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy đơn đặt kính"));
        // Điều kiện: Chỉ được phép sửa đơn khi đơn chưa được gửi xưởng gia công (BR-29)
        if (order.getStatus() != EyeglassOrderStatus.PENDING_CONFIRMATION) {
            throw new IllegalStateException("Chỉ có thể sửa đơn kính ở trạng thái Chờ xác nhận cọc");
        }

        BigDecimal totalAmount = BigDecimal.ZERO;

        // Giá tròng kính
        if (order.getPrescription().getLensType() != null) {
            totalAmount = totalAmount.add(order.getPrescription().getLensType().getBasePrice());
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

        order.setFrame(frame);
        order.setCoatings(coatings);
        order.setTotalAmount(totalAmount);
        order = eyeglassOrderRepository.save(order);

        // Cập nhật lại số tiền trên hóa đơn (InvoiceItem)
        Invoice invoice = invoiceRepository
                .findByAppointmentId(order.getPrescription().getMedicalRecord().getAppointment().getId()).orElse(null);
        if (invoice != null) {
            for (InvoiceItem item : invoice.getItems()) {
                if ("GLASSES".equals(item.getItemType()) && order.getId().equals(item.getRefId())) {
                    // Trừ tiền cũ, cộng tiền mới
                    invoice.setSubTotal(invoice.getSubTotal().subtract(item.getSubTotal()).add(totalAmount));
                    invoice.setTotalAmount(invoice.getTotalAmount().subtract(item.getSubTotal()).add(totalAmount));

                    item.setUnitPrice(totalAmount);
                    item.setSubTotal(totalAmount);
                    break;
                }
            }
            invoiceRepository.save(invoice);
        }

        return toResponse(order);
    }
    // Chức năng: Hủy đơn đặt kính
    @Override
    @Transactional
    public void cancelOrder(Long id, String cancelReason) {
        EyeglassOrder order = eyeglassOrderRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy đơn đặt kính"));
        // Điều kiện: Chỉ có thể hủy đơn kính ở trạng thái chờ xác nhận cọc
        if (order.getStatus() != EyeglassOrderStatus.PENDING_CONFIRMATION) {
            throw new IllegalStateException("Chỉ có thể hủy đơn kính ở trạng thái Chờ xác nhận cọc");
        }

        order.setStatus(EyeglassOrderStatus.CANCELLED);
        order.setCancelReason(cancelReason);
        eyeglassOrderRepository.save(order);

        // Hủy InvoiceItem tương ứng để gỡ tiền
        Invoice invoice = invoiceRepository
                .findByAppointmentId(order.getPrescription().getMedicalRecord().getAppointment().getId()).orElse(null);
        if (invoice != null) {
            InvoiceItem itemToRemove = null;
            for (InvoiceItem item : invoice.getItems()) {
                if ("GLASSES".equals(item.getItemType()) && order.getId().equals(item.getRefId())) {
                    itemToRemove = item;
                    break;
                }
            }
            if (itemToRemove != null && !"CANCELLED".equals(itemToRemove.getStatus())) {
                itemToRemove.setStatus("CANCELLED");
                invoice.setSubTotal(invoice.getSubTotal().subtract(itemToRemove.getSubTotal()));
                invoice.setTotalAmount(invoice.getTotalAmount().subtract(itemToRemove.getSubTotal()));
                invoiceRepository.save(invoice);
            }
        }
    }

    // Chức năng: Lễ tân giao kính cho bệnh nhân và xác nhận hoàn tất (UC-42)
    @Override
    @Transactional
    public EyeglassOrderResponse dispenseOrder(Long id, String staffEmail) {
        // Validate: Lấy thông tin đơn đặt kính và nhân viên
        EyeglassOrder order = eyeglassOrderRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy đơn đặt kính"));

        User user = userRepository.findByEmail(staffEmail)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy user"));

        // Điều kiện: Chặn thao tác nếu đơn kính đã được giao
        if (order.getStatus() == EyeglassOrderStatus.DISPENSED) {
            throw new IllegalStateException("Đơn này đã được giao rồi");
        }

        if (order.getStatus() != EyeglassOrderStatus.READY) {
            throw new IllegalStateException("Chỉ có thể giao đơn kính đang ở trạng thái Sẵn sàng giao");
        }

        order.setStatus(EyeglassOrderStatus.DISPENSED);
        order.setDispensedBy(user);
        order.setDispensedAt(LocalDateTime.now());

        return toResponse(eyeglassOrderRepository.save(order));
    }

    @Override
    @Transactional(readOnly = true)
    public List<EyeglassOrderResponse> getFabricationQueue() {
        return eyeglassOrderRepository
                .findByStatusInOrderByCreatedAtAsc(List.of(
                        EyeglassOrderStatus.PENDING_LAB,
                        EyeglassOrderStatus.IN_PRODUCTION,
                        EyeglassOrderStatus.READY,
                        EyeglassOrderStatus.DISPENSED,
                        EyeglassOrderStatus.CANCELLED))
                .stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional
    public EyeglassOrderResponse startFabrication(Long id) {
        EyeglassOrder order = eyeglassOrderRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy đơn đặt kính"));

        if (order.getStatus() != EyeglassOrderStatus.PENDING_LAB) {
            throw new IllegalStateException(
                    "Chỉ có thể bắt đầu gia công đơn kính đang ở trạng thái Chờ xưởng cắt kính");
        }

        order.setStatus(EyeglassOrderStatus.IN_PRODUCTION);
        return toResponse(eyeglassOrderRepository.save(order));
    }

    @Override
    @Transactional
    public EyeglassOrderResponse completeFabrication(Long id) {
        EyeglassOrder order = eyeglassOrderRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy đơn đặt kính"));

        if (order.getStatus() != EyeglassOrderStatus.IN_PRODUCTION) {
            throw new IllegalStateException("Chỉ có thể hoàn tất gia công đơn kính đang ở trạng thái Đang gia công");
        }

        order.setStatus(EyeglassOrderStatus.READY);
        return toResponse(eyeglassOrderRepository.save(order));
    }

    private EyeglassOrderResponse toResponse(EyeglassOrder order) {
        List<String> coatingNames = order.getCoatings() != null
                ? order.getCoatings().stream().map(EyeglassCoating::getName).collect(Collectors.toList())
                : null;

        EyeglassPrescription prescription = order.getPrescription();

        return EyeglassOrderResponse.builder()
                .id(order.getId())
                .patientId(order.getPatient().getId())
                .patientName(order.getPatient().getFullName())
                .patientPhone(order.getPatient().getPhone())
                .patientGender(order.getPatient().getGender())
                .patientDob(order.getPatient().getDateOfBirth())
                .patientAddress(order.getPatient().getAddress())
                .prescriptionId(prescription.getId())
                .doctorName(prescription.getDoctor() != null ? prescription.getDoctor().getFullName() : null)
                .frameId(order.getFrame() != null ? order.getFrame().getId() : null)
                .frameName(order.getFrame() != null ? order.getFrame().getName() : null)
                .status(order.getStatus().name())
                .totalAmount(order.getTotalAmount())
                .cancelReason(order.getCancelReason())
                .dispensedBy(order.getDispensedBy() != null ? order.getDispensedBy().getId() : null)
                .dispensedByName(order.getDispensedBy() != null ? order.getDispensedBy().getFullName() : null)
                .dispensedAt(order.getDispensedAt())
                .coatings(coatingNames)
                .createdAt(order.getCreatedAt())
                .odSph(prescription.getOdSph())
                .odCyl(prescription.getOdCyl())
                .odAxis(prescription.getOdAxis())
                .odAdd(prescription.getOdAdd())
                .osSph(prescription.getOsSph())
                .osCyl(prescription.getOsCyl())
                .osAxis(prescription.getOsAxis())
                .osAdd(prescription.getOsAdd())
                .pd(prescription.getPd())
                .lensTypeName(prescription.getLensType() != null ? prescription.getLensType().getName() : null)
                .prescriptionNotes(prescription.getNotes())
                .build();
    }
}
