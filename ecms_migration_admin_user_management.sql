-- UC-55 - Manage User Account
-- Thêm 2 cột mới vào bảng users phục vụ tính năng Admin quản lý tài khoản nhân viên:
--   department    : phòng/bộ phận công tác (chỉ áp dụng cho nhân viên, NULL với PATIENT)
--   token_version : tăng dần mỗi lần admin deactivate tài khoản, dùng để vô hiệu hoá JWT
--                   đã cấp trước đó (JWT stateless, không có session phía server).
--
-- Chạy thủ công bởi DBA trên DB ecms_db trước khi deploy code có liên quan.

USE ecms_db;
GO

IF NOT EXISTS (
    SELECT 1 FROM sys.columns
    WHERE object_id = OBJECT_ID('dbo.users') AND name = 'department'
)
BEGIN
    ALTER TABLE dbo.users ADD department NVARCHAR(100) NULL;
END
GO

IF NOT EXISTS (
    SELECT 1 FROM sys.columns
    WHERE object_id = OBJECT_ID('dbo.users') AND name = 'token_version'
)
BEGIN
    ALTER TABLE dbo.users ADD token_version INT NOT NULL DEFAULT 0;
END
GO

-- deleted_at: soft delete cho tài khoản nhân viên đã DISABLED (xem ApiResponse DELETE /admin/users/{id})
IF NOT EXISTS (
    SELECT 1 FROM sys.columns
    WHERE object_id = OBJECT_ID('dbo.users') AND name = 'deleted_at'
)
BEGIN
    ALTER TABLE dbo.users ADD deleted_at DATETIME2 NULL;
END
GO
