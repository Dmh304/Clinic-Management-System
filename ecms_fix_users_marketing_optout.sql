-- ============================================================================
-- ECMS — Bổ sung cột marketing_opt_out cho bảng users
-- (phục vụ tính năng "Hủy đăng ký nhận email khuyến mãi" trong email broadcast)
--
-- Cần chạy trên DB thật vì spring.jpa.hibernate.ddl-auto=none. An toàn chạy lại
-- nhiều lần (tự kiểm tra cột đã tồn tại chưa trước khi ADD).
--
-- CHẠY THẾ NÀO: mở bằng SSMS → Execute (F5). KHÔNG dùng sqlcmd -f 65001. Đổi
-- "ecms_db" thành đúng tên DB thật của bạn nếu khác (vd "ecms_backup").
-- ============================================================================

USE ecms_db;
GO

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('users') AND name = 'marketing_opt_out')
BEGIN
    ALTER TABLE users ADD marketing_opt_out BIT NOT NULL DEFAULT 0;
    PRINT N'✅ Đã thêm cột marketing_opt_out.';
END
ELSE PRINT N'⏭️  Cột marketing_opt_out đã tồn tại — bỏ qua.';
GO
