-- =====================================================================
-- Kịch bản sửa lỗi hiển thị chữ tiếng Việt (lỗi font / Unicode '?')
-- 1. Chuyển các cột VARCHAR chứa tiếng Việt sang NVARCHAR
-- 2. Khôi phục lại đúng ký tự Unicode tiếng Việt cho các bản ghi mẫu
-- =====================================================================

USE ecms_db_final;
GO

SET QUOTED_IDENTIFIER ON;
SET ANSI_NULLS ON;
SET NOCOUNT ON;
GO

-- =====================================================================
-- BƯỚC 1: Đổi kiểu các cột từ VARCHAR sang NVARCHAR
-- =====================================================================
PRINT 'Altering columns to NVARCHAR...';

ALTER TABLE appointments ALTER COLUMN notes NVARCHAR(MAX) NULL;
ALTER TABLE appointments ALTER COLUMN cancel_reason NVARCHAR(MAX) NULL;

ALTER TABLE doctors ALTER COLUMN specialty NVARCHAR(100) NOT NULL;
ALTER TABLE doctors ALTER COLUMN department NVARCHAR(255) NULL;
ALTER TABLE doctors ALTER COLUMN bio NVARCHAR(MAX) NULL;

ALTER TABLE patients ALTER COLUMN address NVARCHAR(MAX) NULL;

ALTER TABLE users ALTER COLUMN address NVARCHAR(MAX) NULL;
ALTER TABLE users ALTER COLUMN department NVARCHAR(255) NULL;

ALTER TABLE lab_orders ALTER COLUMN notes NVARCHAR(MAX) NULL;
ALTER TABLE lab_orders ALTER COLUMN rejection_reason NVARCHAR(MAX) NULL;

ALTER TABLE medicines ALTER COLUMN unit NVARCHAR(255) NOT NULL;

IF EXISTS (SELECT * FROM information_schema.tables WHERE table_name = 'eyeglass_prescriptions')
BEGIN
    ALTER TABLE eyeglass_prescriptions ALTER COLUMN lens_type NVARCHAR(255) NULL;
END
GO

-- =====================================================================
-- BƯỚC 2: Cập nhật dữ liệu Unicode tiếng Việt chính xác
-- =====================================================================
PRINT 'Restoring roles Vietnamese descriptions...';
UPDATE roles SET description = N'Quản trị viên hệ thống' WHERE id = 1;
UPDATE roles SET description = N'Quản lý phòng khám' WHERE id = 2;
UPDATE roles SET description = N'Bác sĩ' WHERE id = 3;
UPDATE roles SET description = N'Lễ tân' WHERE id = 4;
UPDATE roles SET description = N'Dược sĩ' WHERE id = 5;
UPDATE roles SET description = N'Kỹ thuật viên xét nghiệm' WHERE id = 6;
UPDATE roles SET description = N'Điều dưỡng' WHERE id = 7;
UPDATE roles SET description = N'Bệnh nhân' WHERE id = 8;
GO

PRINT 'Restoring users full_name and address...';
UPDATE users SET full_name = N'Nguyễn Quản Trị', address = N'1 Lê Lợi, Q1, TP.HCM' WHERE id = 1;
UPDATE users SET full_name = N'Trần Thị Quản Lý', address = N'2 Nguyễn Huệ, Q1, TP.HCM' WHERE id = 2;
UPDATE users SET full_name = N'BS. Nguyễn Văn An', address = N'3 Pasteur, Q3, TP.HCM' WHERE id = 3;
UPDATE users SET full_name = N'BS. Trần Thị Bình', address = N'4 Đinh Tiên Hoàng, Q1, TP.HCM' WHERE id = 4;
UPDATE users SET full_name = N'BS. Lê Minh Châu', address = N'5 Võ Văn Tần, Q3, TP.HCM' WHERE id = 5;
UPDATE users SET full_name = N'Phạm Lễ Tân Một', address = N'6 Bạch Đằng, Q.BT, TP.HCM' WHERE id = 6;
UPDATE users SET full_name = N'Hoàng Lễ Tân Hai', address = N'7 Cộng Hòa, Q.TB, TP.HCM' WHERE id = 7;
UPDATE users SET full_name = N'Vũ Dược Sĩ', address = N'8 Tô Hiến Thành, Q10, TP.HCM' WHERE id = 8;
UPDATE users SET full_name = N'Đặng Kỹ Thuật Viên', address = N'9 Nguyễn Thị Minh Khai, Q3' WHERE id = 9;
UPDATE users SET full_name = N'Bùi Văn Bệnh Nhân', address = N'10 Lý Thường Kiệt, Q10, TP.HCM' WHERE id = 10;
UPDATE users SET full_name = N'Đinh Thị Hoa', address = N'11 Trần Hưng Đạo, Q5, TP.HCM' WHERE id = 11;
UPDATE users SET full_name = N'Lý Văn Minh', address = N'12 An Dương Vương, Q5, TP.HCM' WHERE id = 12;
UPDATE users SET full_name = N'Ngô Thị Lan', address = N'13 Nguyễn Văn Cừ, Q5, TP.HCM' WHERE id = 13;
UPDATE users SET full_name = N'Tô Văn Dũng', address = N'14 Hùng Vương, Q6, TP.HCM' WHERE id = 14;
UPDATE users SET full_name = N'Lê Thị Điều Dưỡng', address = N'15 Lê Văn Sỹ, Q3, TP.HCM' WHERE id = 15;
UPDATE users SET full_name = N'BS. Trịnh Đình Tuấn', address = N'Địa chỉ Bác sĩ Tuấn' WHERE id = 16;
UPDATE users SET full_name = N'Viên Thuật Kỹ', address = N'Địa chỉ phòng xét nghiệm' WHERE id = 17;
GO

PRINT 'Restoring patients details...';
UPDATE patients SET full_name = N'Bùi Văn Bệnh Nhân', address = N'10 Lý Thường Kiệt, Q10', allergy_notes = N'Dị ứng Penicillin', emergency_contact_name = N'Bùi Thị Mẹ' WHERE id = 1;
UPDATE patients SET full_name = N'Đinh Thị Hoa', address = N'11 Trần Hưng Đạo, Q5', emergency_contact_name = N'Đinh Văn Ba' WHERE id = 2;
UPDATE patients SET full_name = N'Lý Văn Minh', address = N'12 An Dương Vương, Q5', allergy_notes = N'Dị ứng Sulfonamide', emergency_contact_name = N'Lý Thị Vợ' WHERE id = 3;
UPDATE patients SET full_name = N'Ngô Thị Lan', address = N'13 Nguyễn Văn Cừ, Q5', emergency_contact_name = N'Ngô Văn Cha' WHERE id = 4;
UPDATE patients SET full_name = N'Tô Văn Dũng', address = N'14 Hùng Vương, Q6', allergy_notes = N'Cao huyết áp', emergency_contact_name = N'Tô Thị Vợ' WHERE id = 5;
GO

PRINT 'Restoring doctors details...';
UPDATE doctors SET full_name = N'BS. Nguyễn Văn An', specialty = N'Khoa mắt tổng quát', department = N'Phòng khám tổng quát', bio = N'Chuyên gia khám và điều trị các bệnh mắt thông thường.' WHERE id = 1;
UPDATE doctors SET full_name = N'BS. Trần Thị Bình', specialty = N'Khúc xạ & Kính áp tròng', department = N'Phòng khúc xạ', bio = N'Chuyên điều trị tật khúc xạ, tư vấn kính áp tròng.' WHERE id = 2;
UPDATE doctors SET full_name = N'BS. Lê Minh Châu', specialty = N'Phẫu thuật mắt', department = N'Phòng phẫu thuật', bio = N'Bác sĩ phẫu thuật đục thủy tinh thể và Lasik.' WHERE id = 3;
UPDATE doctors SET full_name = N'BS. Trịnh Đình Tuấn', specialty = N'Khoa mắt tổng quát', department = N'Phòng khám tổng quát', bio = N'Bác sĩ Trịnh Đình Tuấn kiểm thử hệ thống.' WHERE id = 4;
GO

PRINT 'Restoring staffs details...';
UPDATE staffs SET full_name = N'Phạm Lễ Tân Một', department = N'Lễ tân', position = N'Lễ tân viên' WHERE id = 1;
UPDATE staffs SET full_name = N'Hoàng Lễ Tân Hai', department = N'Lễ tân', position = N'Lễ tân viên' WHERE id = 2;
UPDATE staffs SET full_name = N'Vũ Dược Sĩ', department = N'Nhà thuốc', position = N'Dược sĩ' WHERE id = 3;
UPDATE staffs SET full_name = N'Đặng Kỹ Thuật Viên', department = N'Xét nghiệm', position = N'Kỹ thuật viên XN' WHERE id = 4;
GO

PRINT 'Restoring lab_technicians details...';
UPDATE lab_technicians SET full_name = N'Viên Thuật Kỹ', specialization = N'Xét nghiệm mắt chuyên sâu' WHERE id = 1;
GO

PRINT 'Restoring service categories...';
UPDATE service_categories SET name = N'Thư giãn mắt' WHERE id = 1;
UPDATE service_categories SET name = N'Trị liệu mắt' WHERE id = 2;
UPDATE service_categories SET name = N'Chăm sóc toàn diện' WHERE id = 3;
UPDATE service_categories SET name = N'Phục hồi thị lực' WHERE id = 4;
GO

PRINT 'Restoring services details...';
UPDATE services SET name = N'Gói Thiền Mắt', description = N'Liệu trình thiền và thư giãn cho mắt, giảm căng thẳng thị giác sau thời gian dài sử dụng màn hình. Kết hợp bài tập yoga mắt và kỹ thuật hít thở.', badge = N'Mới', price_label = N'Giá chỉ từ', content = N'Chi tiết gói thiền mắt...' WHERE id = 1;
UPDATE services SET name = N'Gói Massage Mắt', description = N'Massage vùng mắt chuyên nghiệp bằng tay kết hợp tinh dầu thiên nhiên, giúp lưu thông máu và giảm quầng thâm mắt.', badge = N'Phổ biến', price_label = N'Giá chỉ từ', content = N'Chi tiết gói massage mắt...' WHERE id = 2;
UPDATE services SET name = N'Gói Chăm Sóc Mắt Toàn Diện', description = N'Gói chăm sóc mắt toàn diện gồm kiểm tra thị lực, massage mắt, chiếu đèn hồng ngoại, và tư vấn chế độ dinh dưỡng cho mắt.', badge = N'Best Seller', price_label = N'Giá trọn gói', content = N'Chi tiết gói chăm sóc mắt toàn diện...' WHERE id = 3;
UPDATE services SET name = N'Gói Thư Giãn Mắt Công Nghệ Cao', description = N'Sử dụng thiết bị công nghệ cao: máy massage mắt áp suất khí, rung, nhiệt hồng ngoại và nhạc thư giãn để phục hồi mắt mệt mỏi.', badge = N'Premium', price_label = N'Giá chỉ từ', content = N'Chi tiết gói thư giãn mắt công nghệ cao...' WHERE id = 4;
UPDATE services SET name = N'Liệu Trình Phục Hồi Thị Lực', description = N'Liệu trình chuyên sâu kết hợp các bài tập điều tiết mắt đặc biệt và thiền định sâu để phục hồi thị lực tự nhiên.', badge = N'Cao cấp', price_label = N'Giá trọn gói', content = N'Chi tiết liệu trình phục hồi thị lực...' WHERE id = 5;
UPDATE services SET name = N'Chụp bản đồ giác mạc (Topo)', description = N'Phân tích hình thái giác mạc bằng máy Topographer.' WHERE id = 6;
UPDATE services SET name = N'Xét nghiệm sinh hóa máu cơ bản', description = N'Xét nghiệm đường huyết, mỡ máu phục vụ tiền phẫu.' WHERE id = 7;
UPDATE services SET name = N'Phẫu thuật đục thủy tinh thể', description = N'Phẫu thuật Phaco thay thế thủy tinh thể nhân tạo.' WHERE id = 8;
UPDATE services SET name = N'Khám tổng quát mắt', description = N'Khám đánh giá tổng thể sức khỏe mắt.' WHERE id = 9;
UPDATE services SET name = N'Đo thị lực (VA/BCVA)', description = N'Đo thị lực không kính và có kính chỉnh tốt nhất.' WHERE id = 10;
UPDATE services SET name = N'Đo khúc xạ tự động', description = N'Đo khúc xạ bằng máy Auto-Refractor.' WHERE id = 11;
UPDATE services SET name = N'Đo nhãn áp (IOP)', description = N'Đo áp lực nội nhãn bằng Tonometry.' WHERE id = 12;
UPDATE services SET name = N'Soi đáy mắt', description = N'Soi đáy mắt (Fundoscopy) đánh giá võng mạc.' WHERE id = 13;
UPDATE services SET name = N'Chụp OCT', description = N'Chụp cắt lớp quang học OCT võng mạc/thần kinh thị.' WHERE id = 14;
GO

PRINT 'Restoring medicines details...';
UPDATE medicines SET name = N'Tobramycin 0.3% nhỏ mắt', unit = N'Lọ 5ml', category = N'Kháng sinh nhỏ mắt', description = N'Điều trị nhiễm khuẩn mắt.' WHERE id = 1;
UPDATE medicines SET name = N'Dexamethasone 0.1% nhỏ mắt', unit = N'Lọ 5ml', category = N'Chống viêm nhỏ mắt', description = N'Giảm viêm, dị ứng mắt.' WHERE id = 2;
UPDATE medicines SET name = N'Hylo-Comod nước mắt nhân tạo', unit = N'Lọ 10ml', category = N'Nước mắt nhân tạo', description = N'Điều trị khô mắt.' WHERE id = 3;
UPDATE medicines SET name = N'Timolol 0.5% nhỏ mắt', unit = N'Lọ 5ml', category = N'Hạ nhãn áp', description = N'Điều trị tăng nhãn áp và glaucoma.' WHERE id = 4;
UPDATE medicines SET name = N'Vitamin A 5000 IU', unit = N'Hộp 30 viên', category = N'Vitamin', description = N'Bổ sung Vitamin A, hỗ trợ thị lực.' WHERE id = 5;
UPDATE medicines SET name = N'Ciprofloxacin 0.3% nhỏ mắt', unit = N'Lọ 5ml', category = N'Kháng sinh nhỏ mắt', description = N'Điều trị nhiễm khuẩn giác mạc, kết mạc.' WHERE id = 6;
GO

PRINT 'Restoring old appointments notes...';
UPDATE appointments SET notes = N'Tập thiền mắt' WHERE id = 1;
UPDATE appointments SET notes = N'Thiền thư giãn mắt' WHERE id = 2;
UPDATE appointments SET notes = N'Massage mắt thảo dược' WHERE id = 3;
UPDATE appointments SET notes = N'Phẫu thuật đục TTT mắt phải' WHERE id = 4;
UPDATE appointments SET notes = N'Liệu trình phục hồi thị lực' WHERE id = 5;
UPDATE appointments SET notes = N'Tái khám khúc xạ' WHERE id = 6;
UPDATE appointments SET notes = N'Tư vấn phẫu thuật Lasik' WHERE id = 7;
UPDATE appointments SET notes = NULL, cancel_reason = N'Bệnh nhân bận việc đột xuất' WHERE id = 8;
GO

PRINT 'Cleanup old waiting test appointments to re-insert correctly...';
DELETE FROM appointments WHERE id >= 9;
GO

PRINT 'Database encoding repair completed successfully.';
GO
