-- =====================================================================
-- Sửa lệch schema bảng services: live DB còn cột legacy 'category'
-- (nvarchar(100) NOT NULL, không default) từ thiết kế cũ. App hiện dùng
-- 'category_id' (FK) và KHÔNG ghi vào cột 'category', nên mọi INSERT gói
-- mới đều lỗi "Cannot insert NULL into column 'category'".
-- Cách xử lý an toàn (không mất dữ liệu 12 dòng cũ): cho phép NULL.
-- Cách chạy:
--   sqlcmd -S localhost,1433 -U sa -P <password> -d ecms_db -C -i ecms_fix_services_schema.sql
-- =====================================================================
SET QUOTED_IDENTIFIER ON;
SET ANSI_NULLS ON;

ALTER TABLE services ALTER COLUMN category NVARCHAR(100) NULL;
