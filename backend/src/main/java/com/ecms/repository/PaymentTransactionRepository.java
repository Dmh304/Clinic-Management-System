package com.ecms.repository;

import com.ecms.entity.PaymentTransaction;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

/**
 * @author  ThangNB - HE201024
 * @created 2026-07-11
 * @updated 2026-07-17
 *
 * Data access for {@link PaymentTransaction} — the journal of bank transfers
 * reported by the payment gateway webhook (UC-23 ALT-2).
 */
@Repository
public interface PaymentTransactionRepository extends JpaRepository<PaymentTransaction, Long> {

    /**
     * Looks a transfer up by its gateway transaction id.
     *
     * @param gatewayTxnId the gateway's own transaction identifier
     *
     * Validate: idempotency — gateways retry, so a webhook carrying a
     * gatewayTxnId already on file must be treated as DUPLICATE and must not
     * settle the same invoice twice.
     */
    Optional<PaymentTransaction> findByGatewayTxnId(String gatewayTxnId);

    /** Existence form of {@link #findByGatewayTxnId(String)}, for the duplicate guard. */
    boolean existsByGatewayTxnId(String gatewayTxnId);

    /**
     * Transfer history of one invoice, newest first — shown when the
     * Receptionist inspects how an invoice was settled.
     *
     * @param invoiceId invoice primary key
     */
    List<PaymentTransaction> findByInvoiceIdOrderByReceivedAtDesc(Long invoiceId);

    /**
     * Transfers that never matched an invoice, newest first.
     *
     * Superseded by {@link #findNeedingAttention()} for the reconciliation
     * screen, because this predicate misses OVERPAID rows: an overpayment does
     * settle its invoice, so filtering on {@code status <> 'MATCHED'} alone
     * would hide the very transactions that owe money back.
     */
    @Query("""
            SELECT t FROM PaymentTransaction t
            WHERE t.status <> 'MATCHED'
            ORDER BY t.receivedAt DESC
            """)
    List<PaymentTransaction> findUnreconciled();

    /**
     * Everything a human still has to resolve, newest first — the worklist
     * behind the reconciliation screen.
     *
     * Two independent reasons a row appears:
     *   - it did not settle cleanly ({@code status <> 'MATCHED'}), or
     *   - money is owed back and has not been returned yet
     *     ({@code refundStatus = 'REQUIRED'}), which includes OVERPAID rows
     *     whose invoice was settled perfectly well.
     *
     * IGNORED rows are excluded: an outgoing clinic transfer is not a patient
     * payment and never needs reconciling.
     *
     * Money that arrives without a recognisable invoice code is still journalled
     * rather than dropped, which is what makes this list possible at all.
     */
    @Query("""
            SELECT t FROM PaymentTransaction t
            LEFT JOIN FETCH t.invoice i
            LEFT JOIN FETCH i.patient
            WHERE t.status <> 'IGNORED'
              AND (t.status <> 'MATCHED' OR t.refundStatus = 'REQUIRED')
            ORDER BY t.receivedAt DESC
            """)
    List<PaymentTransaction> findNeedingAttention();

    /**
     * UC-23 E2: tổng tiền đã thực sự về tài khoản cho một hóa đơn — nền tảng của
     * thanh toán từng phần.
     *
     * AMOUNT_MISMATCH nằm trong nhóm được cộng vì đó là dữ liệu cũ: tiền vẫn vào tài
     * khoản thật, chỉ là lúc đó hệ thống chưa biết cộng dồn. Không tính DUPLICATE
     * (phải hoàn), UNMATCHED (chưa gắn hóa đơn) và IGNORED (tiền ra).
     *
     * @param invoiceId khóa chính hóa đơn
     * @return tổng tiền đã nhận, 0 nếu chưa có giao dịch nào
     */
    @Query("""
            SELECT COALESCE(SUM(t.amount), 0) FROM PaymentTransaction t
            WHERE t.invoice.id = :invoiceId
              AND t.status IN ('MATCHED', 'PARTIAL', 'OVERPAID', 'AMOUNT_MISMATCH')
            """)
    java.math.BigDecimal sumReceivedForInvoice(@Param("invoiceId") Long invoiceId);
}
