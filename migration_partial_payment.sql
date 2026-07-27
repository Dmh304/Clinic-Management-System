-- ============================================================================
-- UC-23 E2 — Thanh toán từng phần: nới hai CHECK constraint cho các trạng thái mới.
--
-- 1) invoices.payment_status  + 'PARTIALLY_PAID'  (tiền về một phần, lũy kế chưa đủ)
-- 2) payment_transactions.status  + 'PARTIAL', 'OVERPAID'
--    OVERPAID là bug có sẵn: code đã set giá trị này từ trước nhưng constraint chưa
--    bao giờ cho phép, nên mọi giao dịch chuyển thừa đều làm INSERT thất bại, webhook
--    trả 500 và cổng thanh toán retry vô hạn.
--
-- Chạy: sqlcmd -S localhost,1433 -U sa -P <mật khẩu> -d ecms_db -I -i migration_partial_payment.sql
-- An toàn khi chạy lại nhiều lần.
-- ============================================================================

USE ecms_db;
GO
SET QUOTED_IDENTIFIER ON;
GO

IF EXISTS (SELECT 1 FROM sys.check_constraints WHERE name = 'CK_invoices_payment_status')
    ALTER TABLE invoices DROP CONSTRAINT CK_invoices_payment_status;
GO
ALTER TABLE invoices ADD CONSTRAINT CK_invoices_payment_status
    CHECK (payment_status IN ('UNPAID', 'PENDING_PAYMENT', 'PARTIALLY_PAID', 'PAID', 'PAYMENT_FAILED'));
GO
PRINT N'invoices.payment_status: đã cho phép PARTIALLY_PAID';
GO

IF EXISTS (SELECT 1 FROM sys.check_constraints WHERE name = 'CK_payment_transactions_status')
    ALTER TABLE payment_transactions DROP CONSTRAINT CK_payment_transactions_status;
GO
ALTER TABLE payment_transactions ADD CONSTRAINT CK_payment_transactions_status
    CHECK (status IN ('MATCHED', 'PARTIAL', 'OVERPAID', 'UNMATCHED', 'AMOUNT_MISMATCH', 'DUPLICATE', 'IGNORED'));
GO
PRINT N'payment_transactions.status: đã cho phép PARTIAL và OVERPAID';
GO

-- Dữ liệu cũ: hóa đơn từng bị đánh PAYMENT_FAILED thực chất là đã trả một phần.
-- Chỉ đổi hóa đơn CÓ tiền thực nhận, để không đụng các trường hợp PAYMENT_FAILED khác.
UPDATE i
SET i.payment_status = 'PARTIALLY_PAID'
FROM invoices i
WHERE i.payment_status = 'PAYMENT_FAILED'
  AND EXISTS (
      SELECT 1 FROM payment_transactions t
      WHERE t.invoice_id = i.id
        AND t.status IN ('AMOUNT_MISMATCH', 'PARTIAL')
  );
GO
PRINT N'Đã chuyển các hóa đơn PAYMENT_FAILED có tiền thực nhận sang PARTIALLY_PAID';
GO
