// ThangNBHE201024 - HE187030
// Repository cho PaymentTransaction — nhật ký giao dịch chuyển khoản nhận từ webhook.
package com.ecms.repository;

import com.ecms.entity.PaymentTransaction;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface PaymentTransactionRepository extends JpaRepository<PaymentTransaction, Long> {

    // Chặn xử lý trùng: cổng thanh toán retry cùng một gatewayTxnId thì bỏ qua
    Optional<PaymentTransaction> findByGatewayTxnId(String gatewayTxnId);

    boolean existsByGatewayTxnId(String gatewayTxnId);

    // Lịch sử giao dịch của một hóa đơn — dùng khi lễ tân xem chi tiết đối soát
    List<PaymentTransaction> findByInvoiceIdOrderByReceivedAtDesc(Long invoiceId);

    // Các giao dịch chưa khớp hóa đơn — dùng cho màn hình đối soát thủ công của kế toán
    @Query("""
            SELECT t FROM PaymentTransaction t
            WHERE t.status <> 'MATCHED'
            ORDER BY t.receivedAt DESC
            """)
    List<PaymentTransaction> findUnreconciled();
}
