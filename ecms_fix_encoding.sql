-- =====================================================================
-- Sửa dữ liệu mô tả dịch vụ bị hỏng Unicode (ký tự '?') trong bảng services.
-- Nguyên nhân: dữ liệu được insert thiếu tiền tố N'...' nên SQL Server thay
-- các ký tự tiếng Việt không nằm trong code page mặc định thành '?'.
-- Cách chạy (QUAN TRỌNG: phải có -f 65001 để đọc file dạng UTF-8):
--   sqlcmd -S localhost,1433 -U sa -P <password> -d ecms_db -C -f 65001 -i ecms_fix_encoding.sql
-- =====================================================================
SET QUOTED_IDENTIFIER ON;
SET ANSI_NULLS ON;
SET NOCOUNT ON;

-- BƯỚC 1: Đổi kiểu cột sang NVARCHAR (Unicode). Nguyên nhân gốc: các cột này
-- đang là VARCHAR nên mọi ký tự tiếng Việt bị ép thành '?' khi lưu.
ALTER TABLE services ALTER COLUMN description NVARCHAR(500);
ALTER TABLE services ALTER COLUMN badge NVARCHAR(50);
ALTER TABLE services ALTER COLUMN price_label NVARCHAR(100);

-- BƯỚC 2: Ghi lại đúng nội dung tiếng Việt cho cột mô tả
UPDATE services SET description = N'Khám sức khỏe mắt toàn diện, kiểm tra thị lực và áp suất nhãn cầu.' WHERE id = 1;
UPDATE services SET description = N'Đo độ cận viễn loạn bằng máy tự động.' WHERE id = 2;
UPDATE services SET description = N'Kiểm tra võng mạc và dây thần kinh thị giác.' WHERE id = 3;
UPDATE services SET description = N'Chụp cắt lớp kết hợp quang học để đánh giá võng mạc.' WHERE id = 4;
UPDATE services SET description = N'Đo áp suất trong mắt để sàng lọc tăng nhãn áp.' WHERE id = 5;
UPDATE services SET description = N'Phân tích hình thái giác mạc bằng máy Topographer.' WHERE id = 6;
UPDATE services SET description = N'Xét nghiệm đường huyết, mỡ máu phục vụ tiền phẫu.' WHERE id = 7;
UPDATE services SET description = N'Phẫu thuật Phaco thay thế thủy tinh thể nhân tạo.' WHERE id = 8;
UPDATE services SET description = N'Đo thị lực không kính và có kính chỉnh tốt nhất.' WHERE id = 11;
UPDATE services SET description = N'Giảm căng thẳng mỏi mắt kỹ thuật số với liệu pháp massage kết hợp chườm ấm thảo dược.' WHERE id = 17;
UPDATE services SET description = N'Liệu trình phục hồi tự nhiên thông qua các bài tập điều tiết mắt và thiền định sâu (4 tuần, 8 buổi).' WHERE id = 18;
UPDATE services SET description = N'Gói khám tổng quát và thư giãn cho tối đa 4 thành viên với chi phí tối ưu nhất.' WHERE id = 19;

-- BƯỚC 3: Sửa nhãn nổi bật (badge) bị hỏng
UPDATE services SET badge = N'Phổ biến' WHERE id = 1;

-- Kiểm tra lại kết quả
SELECT id, name, CAST(description AS NVARCHAR(200)) AS descr
FROM services
WHERE id IN (1,2,3,4,5,6,7,8,11,17,18,19)
ORDER BY id;
