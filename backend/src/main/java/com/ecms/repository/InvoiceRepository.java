package com.ecms.repository;

import com.ecms.entity.Invoice;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

/**
 * @author      ThangNB - HE201024
 * @contributor Thái Khắc Hữu Đức - HE204463, Đồng Mạnh Hùng - HE200743, Tuấn - HE204215
 * @created     2026-07-11
 * @updated     2026-07-20
 *
 * Data access for {@link Invoice}. Serves three consumers:
 *   - the Receptionist billing screen (UC-23 / UC-24),
 *   - the patient portal invoice list (UC-24 ALT-2),
 *   - the manager analytics module (UC-49 dashboard, UC-50 revenue report).
 *
 * Every "is there already an invoice" query excludes CANCELLED rows, because
 * BR-09 keeps cancelled invoices in the table forever and they must not block
 * a fresh invoice for the same visit.
 */
@Repository
public interface InvoiceRepository extends JpaRepository<Invoice, Long> {

    /**
     * Settled invoices whose payment landed inside the window — the source
     * rows of the revenue report (UC-50 normal flow step 3).
     * Filters on {@code paidAt}, not {@code createdAt}, so revenue is
     * attributed to the day the money arrived.
     *
     * @param paymentStatus normally "PAID"
     * @param from          window start, inclusive
     * @param to            window end, inclusive
     */
    List<Invoice> findByPaymentStatusAndPaidAtBetween(String paymentStatus, LocalDateTime from, LocalDateTime to);

    /**
     * Counts outstanding invoices for the "Outstanding (unpaid) invoices"
     * widget of the operational dashboard (UC-49 normal flow step 2).
     * Excludes CANCELLED so a voided invoice is not reported as a debt.
     */
    @Query("SELECT COUNT(i) FROM Invoice i WHERE i.paymentStatus <> 'PAID' AND i.status <> 'CANCELLED'")
    long countOutstanding();

    /** Total money outstanding, companion to {@link #countOutstanding()} (UC-49). */
    @Query("SELECT COALESCE(SUM(i.totalAmount), 0) FROM Invoice i WHERE i.paymentStatus <> 'PAID' AND i.status <> 'CANCELLED'")
    java.math.BigDecimal sumOutstanding();

    /** All invoices of one patient, without eager details. */
    List<Invoice> findByPatientId(Long patientId);

    /**
     * Invoice list for the Receptionist screen, newest first, with
     * appointment / patient / doctor / service joined in one round trip
     * to avoid N+1 queries while rendering the table.
     */
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

    /**
     * The one live (non-cancelled) invoice of a visit.
     *
     * Validate: BR-09 / UC-23 E1 — a visit may accumulate several CANCELLED
     * invoices plus at most one live invoice, so the CANCELLED filter is what
     * keeps this a single result instead of a NonUniqueResultException.
     *
     * @param appointmentId visit primary key
     * @return the live invoice, or empty when the visit has none
     */
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

    /**
     * Free-text invoice search by patient name, patient phone or invoice code
     * — backs the search box on the Receptionist billing screen.
     *
     * @param keyword search term, matched case-insensitively on the name
     */
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

    /**
     * Looks an invoice up by its code. Used by the payment webhook, which
     * recovers the invoice code from the bank transfer description in order
     * to settle the right invoice automatically (UC-23 ALT-2 step 5).
     *
     * @param invoiceCode code in the form INV-yyyyMMdd-XXXX
     */
    Optional<Invoice> findByInvoiceCode(String invoiceCode);

    /**
     * Invoices of one visit in a given status, newest first.
     *
     * Used when raising a replacement invoice: if the visit previously had a
     * CANCELLED invoice, its charge lines are restored so "cancel then
     * re-create" reproduces the original itemisation rather than starting
     * from an empty form (UC-23 normal flow step 2, "restore items from a
     * prior cancelled invoice").
     *
     * @param appointmentId visit primary key
     * @param status        DRAFT | ISSUED | CANCELLED
     */
    List<Invoice> findByAppointment_IdAndStatusOrderByCreatedAtDesc(Long appointmentId, String status);

    /**
     * Counts invoices already issued today, to derive the running sequence
     * number of the generated code INV-yyyyMMdd-XXXX.
     *
     * @param dateStr the yyyyMMdd part of the code
     */
    @Query("""
            SELECT COUNT(i) FROM Invoice i
            WHERE i.invoiceCode LIKE CONCAT('INV-', :dateStr, '%')
            """)
    long countByDatePrefix(@Param("dateStr") String dateStr);

    /** Whether a visit has any invoice at all, cancelled ones included. */
    boolean existsByAppointment_Id(Long appointmentId);

    /**
     * Whether a visit already has a live invoice.
     *
     * Validate: UC-23 E1 — blocks a duplicate invoice for the same visit,
     * while still allowing a new one after the previous was CANCELLED (BR-09
     * keeps that cancelled row in place).
     *
     * @param appointmentId visit primary key
     * @param status        the status to exclude, i.e. "CANCELLED"
     */
    boolean existsByAppointment_IdAndStatusNot(Long appointmentId, String status);

    /**
     * Whether a subscription / care package already has a live (non-cancelled)
     * invoice (UC-21). Used both when creating an invoice and when showing the
     * "already paid" flag on CareSessionResponse.
     *
     * @param subscriptionId subscription primary key
     * @param status         the status to exclude, i.e. "CANCELLED"
     */
    boolean existsBySubscription_IdAndStatusNot(Long subscriptionId, String status);

    /**
     * A single patient's invoices with details joined, for the patient portal
     * "My Invoices" screen (UC-24 ALT-2).
     *
     * Validate: BR-08 — the {@code patientId} predicate is what scopes the
     * result to the owning patient; the caller must pass the authenticated
     * patient's own id, never one from the request body.
     *
     * @param patientId owning patient
     */
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