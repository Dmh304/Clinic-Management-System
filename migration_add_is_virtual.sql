-- ============================================================================
-- Bổ sung cột users.is_virtual cho database tạo TRƯỚC khi nhánh có tính năng tài
-- khoản ảo/demo (UC-55) được merge.
--
-- Cùng nguyên nhân với migration_add_marketing_opt_out.sql: cột khai báo NOT NULL,
-- bảng users đã có dữ liệu, SQL Server từ chối ALTER TABLE ... ADD ... NOT NULL nếu
-- không kèm DEFAULT. Hibernate chỉ ghi cảnh báo rồi chạy tiếp nên cột không được tạo,
-- và MỌI truy vấn trên users (kể cả đăng nhập) lỗi "Invalid column name 'is_virtual'".
--
-- Chạy: sqlcmd -S localhost,1433 -U sa -P <mật khẩu> -d ecms_db -I -i migration_add_is_virtual.sql
-- An toàn khi chạy lại nhiều lần.
-- ============================================================================

USE ecms_db;
GO

IF NOT EXISTS (
    SELECT 1 FROM sys.columns
    WHERE object_id = OBJECT_ID('users') AND name = 'is_virtual'
)
BEGIN
    ALTER TABLE users
        ADD is_virtual BIT NOT NULL CONSTRAINT DF_users_is_virtual DEFAULT 0;
    PRINT N'Đã thêm cột users.is_virtual';
END
ELSE
    PRINT N'Cột users.is_virtual đã tồn tại — bỏ qua';
GO
