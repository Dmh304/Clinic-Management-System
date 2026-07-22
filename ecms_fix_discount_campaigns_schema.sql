-- ============================================================================
-- ECMS — Bổ sung cột còn thiếu cho bảng discount_campaigns
--
-- Cần chạy trên DB thật vì spring.jpa.hibernate.ddl-auto=none (entity JPA không
-- tự tạo/sửa cột trên DB đang chạy). Chạy AN TOÀN khi chạy lại nhiều lần — mỗi
-- cột tự kiểm tra đã tồn tại chưa trước khi ADD.
--
-- CHẠY THẾ NÀO: mở bằng SSMS → Execute (F5). KHÔNG dùng sqlcmd -f 65001 (từng
-- làm hỏng dấu tiếng Việt trên DB này). Đổi "ecms_db" thành đúng tên DB thật
-- của bạn nếu khác (một số máy đặt tên là "ecms_backup").
-- ============================================================================

USE ecms_db;
GO

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('discount_campaigns') AND name = 'total_discount_granted')
BEGIN
    ALTER TABLE discount_campaigns ADD total_discount_granted DECIMAL(14,2) NOT NULL DEFAULT 0;
    PRINT N'✅ Đã thêm cột total_discount_granted.';
END
ELSE PRINT N'⏭️  Cột total_discount_granted đã tồn tại — bỏ qua.';
GO

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('discount_campaigns') AND name = 'thumbnail_url')
BEGIN
    ALTER TABLE discount_campaigns ADD thumbnail_url NVARCHAR(500) NULL;
    PRINT N'✅ Đã thêm cột thumbnail_url.';
END
ELSE PRINT N'⏭️  Cột thumbnail_url đã tồn tại — bỏ qua.';
GO

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('discount_campaigns') AND name = 'content')
BEGIN
    ALTER TABLE discount_campaigns ADD content NVARCHAR(MAX) NULL;
    PRINT N'✅ Đã thêm cột content.';
END
ELSE PRINT N'⏭️  Cột content đã tồn tại — bỏ qua.';
GO
