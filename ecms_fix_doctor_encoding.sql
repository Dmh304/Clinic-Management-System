-- =====================================================================
-- Sửa chuyên khoa bác sĩ (doctors.specialty) bị hỏng Unicode (ký tự '?').
-- Nguyên nhân gốc (giống bảng services): cột `specialty` trong live DB là
-- VARCHAR (dù ecms_schema.sql khai báo NVARCHAR). Mọi ký tự tiếng Việt bị
-- ép thành '?' khi lưu, kể cả khi INSERT có tiền tố N'...'. Các cột khác
-- (full_name, department, bio) đã là NVARCHAR nên hiển thị đúng.
--
-- Cách chạy (đọc file đúng UTF-8 qua ADO.NET, KHÔNG dùng sqlcmd -f 65001):
--   xem khối PowerShell ở cuối phiên làm việc, hoặc chạy bằng SSMS.
-- =====================================================================
SET QUOTED_IDENTIFIER ON;
SET ANSI_NULLS ON;
SET NOCOUNT ON;
GO

-- BƯỚC 1: Đổi kiểu cột sang NVARCHAR (Unicode) — nguyên nhân gốc của dấu '?'.
ALTER TABLE doctors ALTER COLUMN specialty NVARCHAR(100) NOT NULL;
GO

-- BƯỚC 2: Ghi lại đúng nội dung tiếng Việt cho cột chuyên khoa.
UPDATE doctors SET specialty = N'Khoa mắt tổng quát'        WHERE id = 1;
UPDATE doctors SET specialty = N'Khúc xạ & Kính áp tròng'   WHERE id = 2;
UPDATE doctors SET specialty = N'Phẫu thuật mắt'            WHERE id = 3;
GO

-- Kiểm tra lại kết quả
SELECT id, full_name, specialty FROM doctors ORDER BY id;
GO
