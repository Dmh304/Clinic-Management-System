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
     * Transfers that never matched an invoice, newest first — the worklist for
     * manual reconciliation by accounting.
     *
     * Money that arrives without a recognisable invoice code is still
     * journalled rather than dropped, which is what makes this list possible.
     */
    @Query("""
            SELECT t FROM PaymentTransaction t
            WHERE t.status <> 'MATCHED'
            ORDER BY t.receivedAt DESC
            """)
    List<PaymentTransaction> findUnreconciled();
}
