package com.ecms.repository;

import com.ecms.entity.Invoice;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface InvoiceRepository extends JpaRepository<Invoice, Long> {

    @Query("""
            SELECT DISTINCT i FROM Invoice i
            LEFT JOIN FETCH i.appointment a
            LEFT JOIN FETCH i.patient p
            LEFT JOIN FETCH a.doctor
            LEFT JOIN FETCH a.clinicService
            ORDER BY i.createdAt DESC
            """)
    List<Invoice> findAllWithDetails();

    @Query("""
            SELECT DISTINCT i FROM Invoice i
            LEFT JOIN FETCH i.appointment a
            LEFT JOIN FETCH i.patient p
            LEFT JOIN FETCH a.doctor
            LEFT JOIN FETCH a.clinicService
            WHERE i.appointment.id = :appointmentId
            """)
    Optional<Invoice> findByAppointmentId(@Param("appointmentId") Long appointmentId);

    @Query("""
            SELECT DISTINCT i FROM Invoice i
            LEFT JOIN FETCH i.appointment a
            LEFT JOIN FETCH i.patient p
            LEFT JOIN FETCH a.doctor
            LEFT JOIN FETCH a.clinicService
            WHERE LOWER(i.patient.fullName) LIKE LOWER(CONCAT('%', :keyword, '%'))
               OR i.patient.phone LIKE CONCAT('%', :keyword, '%')
               OR i.invoiceCode LIKE CONCAT('%', :keyword, '%')
            ORDER BY i.createdAt DESC
            """)
    List<Invoice> searchInvoices(@Param("keyword") String keyword);

    // Đếm số hóa đơn đã tạo trong ngày để sinh mã tự động (INV-yyyyMMdd-XXXX)
    @Query("""
            SELECT COUNT(i) FROM Invoice i
            WHERE i.invoiceCode LIKE CONCAT('INV-', :dateStr, '%')
            """)
    long countByDatePrefix(@Param("dateStr") String dateStr);

    boolean existsByAppointment_Id(Long appointmentId);
}
