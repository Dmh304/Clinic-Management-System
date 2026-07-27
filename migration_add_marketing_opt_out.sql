-- ============================================================================
-- Bổ sung cột users.marketing_opt_out cho database tạo TRƯỚC khi nhánh `ngan` merge.
--
-- Vì sao ddl-auto=update không tự thêm được: cột khai báo NOT NULL và bảng users đã
-- có dữ liệu, SQL Server từ chối ALTER TABLE ... ADD ... NOT NULL nếu không kèm
-- DEFAULT. Hibernate chỉ ghi cảnh báo rồi chạy tiếp, nên cột vẫn thiếu và mọi truy
-- vấn trên users (kể cả đăng nhập) đều lỗi "Invalid column name".
--
-- Chạy: sqlcmd -S localhost,1433 -U sa -P <mật khẩu> -d ecms_db -I -i migration_add_marketing_opt_out.sql
-- An toàn khi chạy lại nhiều lần.
-- ============================================================================

USE ecms_db;
GO

IF NOT EXISTS (
    SELECT 1 FROM sys.columns
    WHERE object_id = OBJECT_ID('users') AND name = 'marketing_opt_out'
)
BEGIN
    -- DEFAULT 0 bắt buộc: các dòng users hiện có phải nhận giá trị ngay.
    ALTER TABLE users
        ADD marketing_opt_out BIT NOT NULL CONSTRAINT DF_users_marketing_opt_out DEFAULT 0;
    PRINT N'Đã thêm cột users.marketing_opt_out';
END
ELSE
    PRINT N'Cột users.marketing_opt_out đã tồn tại — bỏ qua';
GO
