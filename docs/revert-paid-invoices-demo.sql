-- ============================================================================
-- Đưa các hóa đơn ĐÃ THANH TOÁN của bệnh nhân Trang Thắng Tường về lại
-- trạng thái CHỜ THANH TOÁN để demo lại luồng thu tiền (KHÔNG xóa hóa đơn).
--
-- Mục tiêu: INV-20260719-0003 (QR, 335.000đ) và INV-20260719-0002 (Tiền mặt, 238.000đ)
--
-- Sau khi chạy:
--   - Hóa đơn tiền mặt (0002) → status=DRAFT, payment_status=UNPAID
--       → hiện lại nút "Xác nhận nhận được tiền mặt" ở tab "Hóa đơn chờ thanh toán".
--   - Hóa đơn VietQR  (0003) → status=DRAFT, payment_status=PENDING_PAYMENT
--       + xóa payment_transactions của nó → bắn lại webhook curl là gạch nợ được nữa.
--
-- ⚠️ Chạy trong SSMS/Azure Data Studio (DB ecms_db). Bọc transaction: xem bảng kết
--    quả cuối rồi COMMIT (mặc định); muốn hủy thì đổi COMMIT -> ROLLBACK.
-- ============================================================================
USE ecms_db;
GO
SET QUOTED_IDENTIFIER ON;
SET ANSI_NULLS ON;
GO

DECLARE @codes TABLE (code NVARCHAR(30));
INSERT INTO @codes (code) VALUES
  (N'INV-20260719-0002'),
  (N'INV-20260719-0003');

BEGIN TRANSACTION;

-- 1) Xóa giao dịch webhook của các hóa đơn này (giải phóng gateway_txn_id)
DELETE pt
FROM payment_transactions pt
JOIN invoices i ON pt.invoice_id = i.id
WHERE i.invoice_code IN (SELECT code FROM @codes);

-- 2) Revert hóa đơn về trạng thái chờ thanh toán theo phương thức
UPDATE i SET
  i.status         = 'DRAFT',
  i.paid_at        = NULL,
  i.email_status   = 'NOT_SENT',
  i.email_sent_at  = NULL,
  i.payment_status = CASE WHEN i.payment_method = 'VIET_QR' THEN 'PENDING_PAYMENT' ELSE 'UNPAID' END
FROM invoices i
WHERE i.invoice_code IN (SELECT code FROM @codes);

-- Xem lại kết quả
SELECT i.invoice_code, p.full_name, i.payment_method, i.status, i.payment_status, i.total_amount
FROM invoices i JOIN patients p ON i.patient_id = p.id
WHERE i.invoice_code IN (SELECT code FROM @codes);

COMMIT;   -- đổi thành ROLLBACK; nếu chỉ muốn xem trước, chưa muốn đổi thật
GO
