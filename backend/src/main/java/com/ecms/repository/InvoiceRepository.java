// DucTKH
// Repository cho Entity Invoice, hỗ trợ các thao tác truy xuất hóa đơn từ database.
package com.ecms.repository;

import com.ecms.entity.Invoice;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface InvoiceRepository extends JpaRepository<Invoice, Long> {

    // UC-50: hóa đơn đã thanh toán trong khoảng thời gian (theo ngày thu tiền) — dùng cho báo cáo doanh thu
    List<Invoice> findByPaymentStatusAndPaidAtBetween(String paymentStatus, LocalDateTime from, LocalDateTime to);

    // UC-49: đếm hóa đơn còn nợ (chưa PAID, chưa hủy) cho dashboard vận hành
    @Query("SELECT COUNT(i) FROM Invoice i WHERE i.paymentStatus <> 'PAID' AND i.status <> 'CANCELLED'")
    long countOutstanding();

    // UC-49: tổng tiền hóa đơn còn nợ
    @Query("SELECT COALESCE(SUM(i.totalAmount), 0) FROM Invoice i WHERE i.paymentStatus <> 'PAID' AND i.status <> 'CANCELLED'")
    java.math.BigDecimal sumOutstanding();

    // --- Hàm của nhánh Duc ---
    List<Invoice> findByPatientId(Long patientId);

    // --- Các hàm của nhánh main ---
    @Query("""
            SELECT DISTINCT i FROM Invoice i
            LEFT JOIN FETCH i.appointment a
            LEFT JOIN FETCH i.patient p
            LEFT JOIN FETCH a.doctor
            LEFT JOIN FETCH a.clinicService
            LEFT JOIN FETCH i.subscription sub
            LEFT JOIN FETCH sub.service
            ORDER BY i.createdAt DESC
            """)
    List<Invoice> findAllWithDetails();

    // Trả về hóa đơn hoạt động (không bị huỷ) của 1 lịch hẹn — tránh NonUniqueResultException
    // khi tồn tại cả hóa đơn CANCELLED lẫn hóa đơn mới cho cùng 1 lịch hẹn.
    @Query("""
            SELECT DISTINCT i FROM Invoice i
            LEFT JOIN FETCH i.appointment a
            LEFT JOIN FETCH i.patient p
            LEFT JOIN FETCH a.doctor
            LEFT JOIN FETCH a.clinicService
            WHERE i.appointment.id = :appointmentId
              AND i.status <> 'CANCELLED'
            """)
    Optional<Invoice> findByAppointmentId(@Param("appointmentId") Long appointmentId);

    @Query("""
            SELECT DISTINCT i FROM Invoice i
            LEFT JOIN FETCH i.appointment a
            LEFT JOIN FETCH i.patient p
            LEFT JOIN FETCH a.doctor
            LEFT JOIN FETCH a.clinicService
            LEFT JOIN FETCH i.subscription sub
            LEFT JOIN FETCH sub.service
            WHERE LOWER(i.patient.fullName) LIKE LOWER(CONCAT('%', :keyword, '%'))
               OR i.patient.phone LIKE CONCAT('%', :keyword, '%')
               OR i.invoiceCode LIKE CONCAT('%', :keyword, '%')
            ORDER BY i.createdAt DESC
            """)
    List<Invoice> searchInvoices(@Param("keyword") String keyword);

    // ThangNBHE201024 — tra hóa đơn theo mã, dùng khi webhook cổng thanh toán dò mã
    // hóa đơn trong nội dung chuyển khoản để tự động gạch nợ (UC-22).
    Optional<Invoice> findByInvoiceCode(String invoiceCode);

    // ThangNBHE201024 — các hóa đơn của một lịch hẹn theo trạng thái, mới nhất trước.
    // Dùng khi tạo hóa đơn mới: nếu lịch hẹn từng có hóa đơn CANCELLED thì đổ lại đúng
    // khoản phí của hóa đơn đã hủy gần nhất (hủy rồi tạo lại khôi phục nguyên trạng).
    List<Invoice> findByAppointment_IdAndStatusOrderByCreatedAtDesc(Long appointmentId, String status);

    // Đếm số hóa đơn đã tạo trong ngày để sinh mã tự động (INV-yyyyMMdd-XXXX)
    @Query("""
            SELECT COUNT(i) FROM Invoice i
            WHERE i.invoiceCode LIKE CONCAT('INV-', :dateStr, '%')
            """)
    long countByDatePrefix(@Param("dateStr") String dateStr);

    boolean existsByAppointment_Id(Long appointmentId);

    // Kiểm tra lịch hẹn đã có hóa đơn CHƯA BỊ HỦY chưa — dùng để tránh tạo trùng
    // khi hóa đơn cũ đã CANCELLED, lễ tân vẫn có thể tạo lại cho lịch hẹn đó.
    boolean existsByAppointment_IdAndStatusNot(Long appointmentId, String status);

    // UC-21: kiểm tra gói/buổi dịch vụ chăm sóc đã có hóa đơn CHƯA BỊ HỦY chưa —
    // dùng cả khi tạo hóa đơn lẫn khi hiển thị cờ "đã thu tiền" trên CareSessionResponse.
    boolean existsBySubscription_IdAndStatusNot(Long subscriptionId, String status);

    // Lấy tất cả hóa đơn của một bệnh nhân kèm chi tiết — dùng cho trang "Hóa đơn của tôi" (Patient)
    @Query("""
            SELECT DISTINCT i FROM Invoice i
            LEFT JOIN FETCH i.appointment a
            LEFT JOIN FETCH i.patient p
            LEFT JOIN FETCH a.doctor
            LEFT JOIN FETCH a.clinicService
            WHERE i.patient.id = :patientId
            ORDER BY i.createdAt DESC
            """)
    List<Invoice> findByPatientIdWithDetails(@Param("patientId") Long patientId);
}