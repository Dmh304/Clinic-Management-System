-- ============================================================================
-- ECMS — Eyes Clinic Management System
-- FILE 2/2: DATA SEED (dữ liệu demo + tài khoản đăng nhập)
--
-- CHẠY SAU ecms_schema.sql (roles/system_configs/notification_templates đã có).
-- CÁCH CHẠY (chọn 1 trong 2):
--   1. SSMS  : mở file này → Execute (F5)
--   2. sqlcmd: sqlcmd -S localhost,1433 -U sa -P <password> -C -f 65001 -i ecms_data_seed.sql
--
-- MẬT KHẨU TẤT CẢ TÀI KHOẢN: Password@123
--
-- TÀI KHOẢN NHÂN VIÊN (email thật của team):
--   mh3k42k6@gmail.com     → ADMIN
--   bichngan1826@gmail.com → RECEPTIONIST (lễ tân)
--   andreale389@gmail.com  → NURSE (điều dưỡng)
-- Các nhân viên còn lại (manager/bác sĩ/dược sĩ/KTV) dùng email ảo @ecms.vn.
-- TÀI KHOẢN BỆNH NHÂN: toàn bộ là tài khoản ảo patient1..5@gmail.com.
-- ============================================================================

USE ecms_db;
GO
SET QUOTED_IDENTIFIER ON;
SET ANSI_NULLS ON;
GO

-- ============================================================================
-- 1. users — 15 tài khoản
--    roles: ADMIN=1, MANAGER=2, DOCTOR=3, RECEPTIONIST=4, PHARMACIST=5,
--           LAB_TECHNICIAN=6, NURSE=7, PATIENT=8
-- ============================================================================
SET IDENTITY_INSERT users ON;

DECLARE @pw NVARCHAR(255) = N'$2a$10$gfSU.mS4YQd7cICUyobl/en..jS9epCm4YpeYiRbllaEL2TbAOGmy'; -- Password@123

INSERT INTO users
    (id, email, password, full_name, phone_number, date_of_birth, gender,
     address, department, role_id, status, auth_provider, created_at)
VALUES
-- ===== Nhân viên (email thật) =====
(1,  N'mh3k42k6@gmail.com',     @pw, N'Mạnh Hùng',          N'0967396756', '2006-04-30', 'MALE',
     N'Ngũ Phúc, Kim Thành, Hải Dương',  N'Ban quản trị',  1, 'ACTIVE', 'LOCAL', GETDATE()),

(6,  N'bichngan1826@gmail.com', @pw, N'Lê Bích Ngân',       N'0901000006', '2004-06-18', 'FEMALE',
     N'6 Bạch Đằng, Q.BT, TP.HCM',       N'Lễ tân',        4, 'ACTIVE', 'LOCAL', GETDATE()),

(15, N'andreale389@gmail.com',  @pw, N'Andrea Lê',          N'0901000099', '2004-04-10', 'FEMALE',
     N'15 Lê Văn Sỹ, Q3, TP.HCM',        N'Điều dưỡng',    7, 'ACTIVE', 'LOCAL', GETDATE()),

-- ===== Nhân viên (email ảo @ecms.vn) =====
(2,  N'manager@ecms.vn',        @pw, N'Trần Thị Quản Lý',   N'0901000002', '1988-07-20', 'FEMALE',
     N'2 Nguyễn Huệ, Q1, TP.HCM',        N'Ban giám đốc',  2, 'ACTIVE', 'LOCAL', GETDATE()),

(3,  N'doctor.nguyen@ecms.vn',  @pw, N'BS. Nguyễn Văn An',  N'0901000003', '1980-01-10', 'MALE',
     N'3 Pasteur, Q3, TP.HCM',           N'Phòng khám tổng quát', 3, 'ACTIVE', 'LOCAL', GETDATE()),

(4,  N'doctor.tran@ecms.vn',    @pw, N'BS. Trần Thị Bình',  N'0901000004', '1983-05-25', 'FEMALE',
     N'4 Đinh Tiên Hoàng, Q1, TP.HCM',   N'Phòng khúc xạ', 3, 'ACTIVE', 'LOCAL', GETDATE()),

(5,  N'doctor.le@ecms.vn',      @pw, N'BS. Lê Minh Châu',   N'0901000005', '1979-11-08', 'MALE',
     N'5 Võ Văn Tần, Q3, TP.HCM',        N'Phòng phẫu thuật', 3, 'ACTIVE', 'LOCAL', GETDATE()),

(7,  N'reception2@ecms.vn',     @pw, N'Hoàng Lễ Tân',       N'0901000007', '1997-09-30', 'MALE',
     N'7 Cộng Hòa, Q.TB, TP.HCM',        N'Lễ tân',        4, 'ACTIVE', 'LOCAL', GETDATE()),

(8,  N'pharmacist@ecms.vn',     @pw, N'Vũ Dược Sĩ',         N'0901000008', '1990-06-18', 'FEMALE',
     N'8 Tô Hiến Thành, Q10, TP.HCM',    N'Nhà thuốc',     5, 'ACTIVE', 'LOCAL', GETDATE()),

(9,  N'labtech@ecms.vn',        @pw, N'Đặng Kỹ Thuật Viên', N'0901000009', '1993-02-22', 'MALE',
     N'9 Nguyễn Thị Minh Khai, Q3',      N'Xét nghiệm',    6, 'ACTIVE', 'LOCAL', GETDATE()),

-- ===== Bệnh nhân (toàn bộ tài khoản ảo) =====
(10, N'patient1@gmail.com',     @pw, N'Bùi Văn Bình',       N'0912000001', '1990-03-10', 'MALE',
     N'10 Lý Thường Kiệt, Q10, TP.HCM',  NULL, 8, 'ACTIVE', 'LOCAL', GETDATE()),

(11, N'patient2@gmail.com',     @pw, N'Đinh Thị Hoa',       N'0912000002', '1995-08-15', 'FEMALE',
     N'11 Trần Hưng Đạo, Q5, TP.HCM',    NULL, 8, 'ACTIVE', 'LOCAL', GETDATE()),

(12, N'patient3@gmail.com',     @pw, N'Lý Văn Minh',        N'0912000003', '1982-12-05', 'MALE',
     N'12 An Dương Vương, Q5, TP.HCM',   NULL, 8, 'ACTIVE', 'LOCAL', GETDATE()),

(13, N'patient4@gmail.com',     @pw, N'Ngô Thị Lan',        N'0912000004', '2000-05-20', 'FEMALE',
     N'13 Nguyễn Văn Cừ, Q5, TP.HCM',    NULL, 8, 'ACTIVE', 'LOCAL', GETDATE()),

(14, N'patient5@gmail.com',     @pw, N'Tô Văn Dũng',        N'0912000005', '1975-07-07', 'MALE',
     N'14 Hùng Vương, Q6, TP.HCM',       NULL, 8, 'ACTIVE', 'LOCAL', GETDATE());

SET IDENTITY_INSERT users OFF;
GO

-- ============================================================================
-- 2. doctors (user 3, 4, 5)
-- ============================================================================
SET IDENTITY_INSERT doctors ON;

INSERT INTO doctors
    (id, user_id, doctor_code, full_name, license_number, specialty, department,
     phone_number, email, experience_years, bio, status, created_at)
VALUES
(1, 3, N'DR001', N'BS. Nguyễn Văn An',  N'BV-HCM-001234', N'Khoa mắt tổng quát',
    N'Phòng khám tổng quát', N'0901000003', N'doctor.nguyen@ecms.vn', 12,
    N'Chuyên gia khám và điều trị các bệnh mắt thông thường.', 'ACTIVE', GETDATE()),

(2, 4, N'DR002', N'BS. Trần Thị Bình',  N'BV-HCM-005678', N'Khúc xạ & Kính áp tròng',
    N'Phòng khúc xạ', N'0901000004', N'doctor.tran@ecms.vn', 9,
    N'Chuyên điều trị tật khúc xạ, tư vấn kính áp tròng.', 'ACTIVE', GETDATE()),

(3, 5, N'DR003', N'BS. Lê Minh Châu',   N'BV-HCM-009012', N'Phẫu thuật mắt',
    N'Phòng phẫu thuật', N'0901000005', N'doctor.le@ecms.vn', 15,
    N'Bác sĩ phẫu thuật đục thủy tinh thể và Lasik.', 'ACTIVE', GETDATE());

SET IDENTITY_INSERT doctors OFF;
GO

-- ============================================================================
-- 3. lab_technicians (user 9)
-- ============================================================================
SET IDENTITY_INSERT lab_technicians ON;

INSERT INTO lab_technicians
    (id, user_id, lab_tech_code, full_name, license_number, specialization,
     phone_number, email, status, created_at)
VALUES
(1, 9, N'LT001', N'Đặng Kỹ Thuật Viên', N'LT-LIC-200009', N'Xét nghiệm mắt chuyên sâu',
    N'0901000009', N'labtech@ecms.vn', 'ACTIVE', GETDATE());

SET IDENTITY_INSERT lab_technicians OFF;
GO

-- ============================================================================
-- 4. staffs — hồ sơ nhân sự chung (lễ tân, dược sĩ, điều dưỡng)
-- ============================================================================
SET IDENTITY_INSERT staffs ON;

INSERT INTO staffs
    (id, user_id, employee_code, full_name, department, position, phone_number, hire_date, status, created_at)
VALUES
(1, 6,  N'EMP001', N'Lê Bích Ngân',       N'Lễ tân',      N'Lễ tân viên',  N'0901000006', '2024-01-15', 'ACTIVE', GETDATE()),
(2, 7,  N'EMP002', N'Hoàng Lễ Tân',       N'Lễ tân',      N'Lễ tân viên',  N'0901000007', '2023-03-01', 'ACTIVE', GETDATE()),
(3, 8,  N'EMP003', N'Vũ Dược Sĩ',         N'Nhà thuốc',   N'Dược sĩ',      N'0901000008', '2021-06-10', 'ACTIVE', GETDATE()),
(4, 15, N'EMP004', N'Andrea Lê',          N'Điều dưỡng',  N'Điều dưỡng viên', N'0901000099', '2024-09-20', 'ACTIVE', GETDATE());

SET IDENTITY_INSERT staffs OFF;
GO

-- ============================================================================
-- 5. patients — 5 bệnh nhân có tài khoản (user 10-14) + 1 bệnh nhi vãng lai
--    (không có tài khoản — minh họa đặt hộ/walk-in, user_id NULL)
-- ============================================================================
SET IDENTITY_INSERT patients ON;

INSERT INTO patients
    (id, user_id, patient_code, full_name, date_of_birth, gender, phone, email, address,
     cccd, blood_type, allergy_notes, emergency_contact_name, emergency_contact_phone, status, created_at)
VALUES
(1, 10, N'PAT001', N'Bùi Văn Bình',   '1990-03-10', 'MALE',   N'0912000001', N'patient1@gmail.com',
    N'10 Lý Thường Kiệt, Q10, TP.HCM', N'079090001234', 'O',  N'Dị ứng Penicillin',
    N'Bùi Thị Mai', N'0912100001', 'ACTIVE', GETDATE()),

(2, 11, N'PAT002', N'Đinh Thị Hoa',   '1995-08-15', 'FEMALE', N'0912000002', N'patient2@gmail.com',
    N'11 Trần Hưng Đạo, Q5, TP.HCM',   N'079095002345', 'A',  NULL,
    N'Đinh Văn Ba', N'0912100002', 'ACTIVE', GETDATE()),

(3, 12, N'PAT003', N'Lý Văn Minh',    '1982-12-05', 'MALE',   N'0912000003', N'patient3@gmail.com',
    N'12 An Dương Vương, Q5, TP.HCM',  N'079082003456', 'B',  N'Dị ứng Sulfonamide',
    N'Lý Thị Hạnh', N'0912100003', 'ACTIVE', GETDATE()),

(4, 13, N'PAT004', N'Ngô Thị Lan',    '2000-05-20', 'FEMALE', N'0912000004', N'patient4@gmail.com',
    N'13 Nguyễn Văn Cừ, Q5, TP.HCM',   N'079000004567', 'AB', NULL,
    N'Ngô Văn Cường', N'0912100004', 'ACTIVE', GETDATE()),

(5, 14, N'PAT005', N'Tô Văn Dũng',    '1975-07-07', 'MALE',   N'0912000005', N'patient5@gmail.com',
    N'14 Hùng Vương, Q6, TP.HCM',      N'079075005678', 'UNKNOWN', N'Cao huyết áp',
    N'Tô Thị Vân', N'0912100005', 'ACTIVE', GETDATE()),

(6, NULL, N'PAT006', N'Bé Trần Gia Bảo', '2020-08-09', 'MALE', N'0913000099', NULL,
    N'27 Phan Xích Long, Q.PN, TP.HCM', NULL, 'UNKNOWN', NULL,
    N'Trần Văn Phú (bố)', N'0913000099', 'ACTIVE', GETDATE());

SET IDENTITY_INSERT patients OFF;
GO

-- ============================================================================
-- 6. service_categories + services
--    id 1-5  : CARE     (gói chăm sóc — trang dịch vụ công khai)
--    id 6-14 : CLINICAL (khám/chẩn đoán/phẫu thuật — chọn khi đặt lịch)
-- ============================================================================
SET IDENTITY_INSERT service_categories ON;
INSERT INTO service_categories (id, name, slug, display_order) VALUES
(1, N'Thư giãn mắt',       'thu-gian-mat',       1),
(2, N'Trị liệu mắt',       'tri-lieu-mat',       2),
(3, N'Chăm sóc toàn diện', 'cham-soc-toan-dien', 3),
(4, N'Phục hồi thị lực',   'phuc-hoi-thi-luc',   4);
SET IDENTITY_INSERT service_categories OFF;
GO

SET IDENTITY_INSERT services ON;

INSERT INTO services
    (id, name, description, price, duration_minutes, category_id, slug, thumbnail_url, content,
     badge, price_label, sessions_included, validity_days, service_type, is_active, is_popular, display_order, created_at)
VALUES
(1, N'Gói Thiền Mắt',
    N'Liệu trình thiền và thư giãn cho mắt, giảm căng thẳng thị giác sau thời gian dài dùng màn hình.',
    350000, 45, 1, 'goi-thien-mat',
    'https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=600&h=360&fit=crop&auto=format',
    N'Chi tiết gói thiền mắt: kết hợp bài tập yoga mắt và kỹ thuật hít thở...',
    N'Mới', N'Giá chỉ từ', 5, 30, 'CARE', 1, 0, 1, GETDATE()),

(2, N'Gói Massage Mắt',
    N'Massage vùng mắt chuyên nghiệp bằng tay kết hợp tinh dầu thiên nhiên, giảm quầng thâm mắt.',
    250000, 30, 2, 'goi-massage-mat',
    'https://images.unsplash.com/photo-1616394584738-fc6e612e71b9?w=600&h=360&fit=crop&auto=format',
    N'Chi tiết gói massage mắt: giúp lưu thông máu quanh vùng mắt...',
    N'Phổ biến', N'Giá chỉ từ', 8, 45, 'CARE', 1, 1, 2, GETDATE()),

(3, N'Gói Chăm Sóc Mắt Toàn Diện',
    N'Kiểm tra thị lực, massage mắt, chiếu đèn hồng ngoại và tư vấn dinh dưỡng cho mắt.',
    1500000, 60, 3, 'goi-cham-soc-mat-toan-dien',
    'https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=600&h=360&fit=crop&auto=format',
    N'Chi tiết gói chăm sóc mắt toàn diện...',
    N'Best Seller', N'Giá trọn gói', 10, 60, 'CARE', 1, 1, 3, GETDATE()),

(4, N'Gói Thư Giãn Mắt Công Nghệ Cao',
    N'Máy massage mắt áp suất khí, rung, nhiệt hồng ngoại và nhạc thư giãn phục hồi mắt mệt mỏi.',
    500000, 40, 1, 'goi-thu-gian-mat-cong-nghe-cao',
    'https://images.unsplash.com/photo-1573497491765-dccce02b29df?w=600&h=360&fit=crop&auto=format',
    N'Chi tiết gói thư giãn mắt công nghệ cao...',
    N'Premium', N'Giá chỉ từ', 6, 30, 'CARE', 1, 0, 4, GETDATE()),

(5, N'Liệu Trình Phục Hồi Thị Lực',
    N'Liệu trình chuyên sâu kết hợp bài tập điều tiết mắt đặc biệt và thiền định sâu.',
    2800000, 90, 4, 'lieu-trinh-phuc-hoi-thi-luc',
    'https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=600&h=360&fit=crop&auto=format',
    N'Chi tiết liệu trình phục hồi thị lực...',
    N'Cao cấp', N'Giá trọn gói', 12, 90, 'CARE', 1, 0, 5, GETDATE()),

-- Dịch vụ khám/chẩn đoán/phẫu thuật (CLINICAL)
(6,  N'Chụp bản đồ giác mạc (Topo)',      N'Phân tích hình thái giác mạc bằng máy Topographer.',       250000,   20, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'CLINICAL', 1, 0, 6,  GETDATE()),
(7,  N'Xét nghiệm sinh hóa máu cơ bản',   N'Xét nghiệm đường huyết, mỡ máu phục vụ tiền phẫu.',        180000,   60, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'CLINICAL', 1, 0, 7,  GETDATE()),
(8,  N'Phẫu thuật đục thủy tinh thể',     N'Phẫu thuật Phaco thay thể thủy tinh nhân tạo.',            15000000, 90, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'CLINICAL', 1, 0, 8,  GETDATE()),
(9,  N'Khám tổng quát mắt',               N'Khám đánh giá tổng thể sức khỏe mắt.',                     200000,   30, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'CLINICAL', 1, 0, 9,  GETDATE()),
(10, N'Đo thị lực (VA/BCVA)',             N'Đo thị lực không kính và có kính chỉnh tốt nhất.',         80000,    10, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'CLINICAL', 1, 0, 10, GETDATE()),
(11, N'Đo khúc xạ tự động',               N'Đo khúc xạ bằng máy Auto-Refractor.',                      100000,   15, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'CLINICAL', 1, 0, 11, GETDATE()),
(12, N'Đo nhãn áp (IOP)',                 N'Đo áp lực nội nhãn bằng Tonometry.',                       100000,   10, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'CLINICAL', 1, 0, 12, GETDATE()),
(13, N'Soi đáy mắt',                      N'Soi đáy mắt (Fundoscopy) đánh giá võng mạc.',              150000,   20, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'CLINICAL', 1, 0, 13, GETDATE()),
(14, N'Chụp OCT',                         N'Chụp cắt lớp quang học OCT võng mạc/thần kinh thị.',       350000,   20, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'CLINICAL', 1, 0, 14, GETDATE());

SET IDENTITY_INSERT services OFF;
GO

-- ============================================================================
-- 7. medicines
-- ============================================================================
SET IDENTITY_INSERT medicines ON;

INSERT INTO medicines (id, name, dosage_form, unit, unit_price, created_at) VALUES
(1, N'Tobramycin 0.3% nhỏ mắt',      'DROP',   N'Lọ 5ml',      45000, GETDATE()),
(2, N'Dexamethasone 0.1% nhỏ mắt',   'DROP',   N'Lọ 5ml',      38000, GETDATE()),
(3, N'Hylo-Comod nước mắt nhân tạo', 'DROP',   N'Lọ 10ml',     85000, GETDATE()),
(4, N'Timolol 0.5% nhỏ mắt',         'DROP',   N'Lọ 5ml',      55000, GETDATE()),
(5, N'Vitamin A 5000 IU',            'TABLET', N'Hộp 30 viên', 30000, GETDATE()),
(6, N'Ciprofloxacin 0.3% nhỏ mắt',   'DROP',   N'Lọ 5ml',      42000, GETDATE());

SET IDENTITY_INSERT medicines OFF;
GO

-- ============================================================================
-- 8. discount_campaigns (UC-42)
-- ============================================================================
SET IDENTITY_INSERT discount_campaigns ON;

INSERT INTO discount_campaigns
    (id, name, description, type, value, voucher_code, valid_from, valid_to,
     min_purchase_amount, max_usage_count, used_count, is_active, created_at)
VALUES
(1, N'Hè rực rỡ — giảm 10% gói chăm sóc', N'Áp dụng cho mọi gói CARE trong mùa hè.',
    'PERCENTAGE', 10, N'SUMMER10',
    CAST(DATEADD(DAY,-30,GETDATE()) AS DATE), CAST(DATEADD(DAY,60,GETDATE()) AS DATE),
    200000, 100, 1, 1, GETDATE()),

(2, N'Voucher tri ân khách hàng 50K', N'Giảm trực tiếp 50.000đ cho hóa đơn từ 500.000đ.',
    'FIXED_AMOUNT', 50000, N'GIAM50K',
    CAST(DATEADD(DAY,-10,GETDATE()) AS DATE), CAST(DATEADD(DAY,30,GETDATE()) AS DATE),
    500000, 50, 0, 1, GETDATE());

SET IDENTITY_INSERT discount_campaigns OFF;
GO

-- ============================================================================
-- 9. appointments — 9 lịch hẹn đủ trạng thái
--    (4 COMPLETED quá khứ, IN_PROGRESS + WAITING hôm nay,
--     CONFIRMED ngày mai, PENDING ngày kia, CANCELLED)
-- ============================================================================
SET IDENTITY_INSERT appointments ON;

DECLARE @d_m3 DATETIME2 = CAST(CAST(DATEADD(DAY,-3, GETDATE()) AS DATE) AS DATETIME2);
DECLARE @d_m2 DATETIME2 = CAST(CAST(DATEADD(DAY,-2, GETDATE()) AS DATE) AS DATETIME2);
DECLARE @d_0  DATETIME2 = CAST(CAST(GETDATE()               AS DATE) AS DATETIME2);
DECLARE @d_p1 DATETIME2 = CAST(CAST(DATEADD(DAY, 1, GETDATE()) AS DATE) AS DATETIME2);
DECLARE @d_p2 DATETIME2 = CAST(CAST(DATEADD(DAY, 2, GETDATE()) AS DATE) AS DATETIME2);

INSERT INTO appointments
    (id, patient_id, doctor_id, service_id, appointment_time, time_slot, type, status,
     notes, queue_number, check_in_time, check_in_by, booked_by,
     cancel_reason, cancelled_by, cancelled_at, created_at)
VALUES
-- Đã hoàn thành (có bệnh án + hóa đơn)
(1, 1, 1, 9,  DATEADD(MINUTE, 7*60+45, @d_m3), N'07:30 - 08:00', 'ONLINE',  'COMPLETED',
    N'Mắt mờ, nhức đầu khi nhìn màn hình', 1, DATEADD(MINUTE, 7*60+40, @d_m3), 6, 10,
    NULL, NULL, NULL, DATEADD(DAY,-4,GETDATE())),

(2, 2, 1, 9,  DATEADD(MINUTE, 8*60+30, @d_m3), N'08:30 - 09:00', 'WALK_IN', 'COMPLETED',
    N'Mắt đỏ, chảy ghèn 3 ngày',           2, DATEADD(MINUTE, 8*60+25, @d_m3), 6, NULL,
    NULL, NULL, NULL, DATEADD(DAY,-3,GETDATE())),

(3, 3, 2, 11, DATEADD(MINUTE, 9*60,    @d_m3), N'09:00 - 09:30', 'ONLINE',  'COMPLETED',
    N'Mờ mắt khi nhìn xa, khó lái xe ban đêm', 3, DATEADD(MINUTE, 8*60+55, @d_m3), 7, 12,
    NULL, NULL, NULL, DATEADD(DAY,-5,GETDATE())),

(4, 4, 3, 8,  DATEADD(MINUTE, 7*60+30, @d_m2), N'07:30 - 09:00', 'ONLINE',  'COMPLETED',
    N'Phẫu thuật đục thủy tinh thể mắt phải', 1, DATEADD(MINUTE, 7*60+20, @d_m2), 6, 13,
    NULL, NULL, NULL, DATEADD(DAY,-7,GETDATE())),

-- Hôm nay
(5, 5, 1, 9,  DATEADD(MINUTE, 9*60,    @d_0),  N'09:00 - 09:30', 'WALK_IN', 'IN_PROGRESS',
    N'Khô mắt, cộm xốn kéo dài',           1, DATEADD(MINUTE, 8*60+55, @d_0), 6, NULL,
    NULL, NULL, NULL, GETDATE()),

(6, 6, 1, 10, DATEADD(MINUTE, 10*60,   @d_0),  N'10:00 - 10:30', 'WALK_IN', 'WAITING',
    N'Bé kiểm tra thị lực lần đầu (bố đưa đi)', 2, DATEADD(MINUTE, 9*60+55, @d_0), 6, NULL,
    NULL, NULL, NULL, GETDATE()),

-- Sắp tới
(7, 1, 2, 6,  DATEADD(MINUTE, 9*60,    @d_p1), N'09:00 - 09:30', 'ONLINE',  'CONFIRMED',
    N'Tái khám khúc xạ, chụp Topo theo hẹn', NULL, NULL, NULL, 10,
    NULL, NULL, NULL, GETDATE()),

(8, 2, 3, 8,  DATEADD(MINUTE, 7*60+30, @d_p2), N'07:30 - 08:00', 'ONLINE',  'PENDING',
    N'Tư vấn phẫu thuật Lasik',            NULL, NULL, NULL, 11,
    NULL, NULL, NULL, GETDATE()),

-- Đã hủy (bệnh nhân tự hủy)
(9, 3, 1, 9,  DATEADD(MINUTE, 10*60,   @d_p1), N'10:00 - 10:30', 'ONLINE',  'CANCELLED',
    NULL, NULL, NULL, NULL, 12,
    N'Bệnh nhân bận việc đột xuất', 12, GETDATE(), GETDATE());

SET IDENTITY_INSERT appointments OFF;
GO

-- ============================================================================
-- 10. medical_records — bệnh án cho 4 lịch hẹn COMPLETED (appt 1-4)
--     locked_by = user_id của bác sĩ khóa hồ sơ
-- ============================================================================
SET IDENTITY_INSERT medical_records ON;

INSERT INTO medical_records
    (id, appointment_id, patient_id, doctor_id,
     chief_complaint, symptoms, diagnosis, treatment_plan, notes,
     va_l, va_r, bcva_l, bcva_r,
     sph_l, cyl_l, axis_l, iop_l,
     sph_r, cyl_r, axis_r, iop_r,
     total_amount, locked_at, locked_by, status, created_at)
VALUES
-- MR1: Cận thị tăng độ (appt 1, patient 1, doctor 1)
(1, 1, 1, 1,
    N'Mắt mờ, nhức đầu sau khi nhìn màn hình',
    N'Thị lực giảm cả 2 mắt, không đỏ không đau',
    N'Cận thị tăng độ OU',
    N'Đổi kính, hạn chế màn hình, tái khám 6 tháng',
    N'Bệnh nhân làm việc máy tính >8h/ngày',
    0.6, 0.5, 1.0, 1.0,
    -2.50, -0.50, 180, 14.0,
    -3.00, -0.75, 175, 13.5,
    550000, DATEADD(DAY,-3,GETDATE()), 3, 'COMPLETED', DATEADD(DAY,-3,GETDATE())),

-- MR2: Viêm kết mạc (appt 2, patient 2, doctor 1)
(2, 2, 2, 1,
    N'Mắt đỏ, chảy ghèn 3 ngày',
    N'Kết mạc cương tụ, tiết tố nhầy mủ 2 mắt',
    N'Viêm kết mạc cấp do vi khuẩn',
    N'Nhỏ kháng sinh + chống viêm 7 ngày, rửa mắt bằng nước muối sinh lý',
    NULL,
    0.9, 0.8, 1.0, 1.0,
    NULL, NULL, NULL, 15.0,
    NULL, NULL, NULL, 14.5,
    328000, DATEADD(DAY,-3,GETDATE()), 3, 'COMPLETED', DATEADD(DAY,-3,GETDATE())),

-- MR3: Cận + loạn thị (appt 3, patient 3, doctor 2)
(3, 3, 3, 2,
    N'Mờ mắt khi nhìn xa, khó lái xe ban đêm',
    N'Thị lực giảm, quầng sáng quanh đèn về đêm',
    N'Cận thị OU, loạn thị nhẹ',
    N'Cấp đơn kính, tư vấn kính áp tròng toric nếu muốn',
    NULL,
    0.5, 0.4, 1.0, 1.0,
    -2.75, -0.50, 170, 13.0,
    -3.25, -0.50, 165, 12.5,
    100000, DATEADD(DAY,-3,GETDATE()), 4, 'COMPLETED', DATEADD(DAY,-3,GETDATE())),

-- MR4: Đục thủy tinh thể (appt 4, patient 4, doctor 3)
(4, 4, 4, 3,
    N'Nhìn mờ như sương, chói sáng mạnh',
    N'Đục thể thủy tinh độ 3 cả 2 mắt',
    N'Đục thể thủy tinh tuổi già OU',
    N'Phẫu thuật Phaco + IOL cả 2 mắt, mắt phải trước',
    N'Đã xét nghiệm tiền phẫu, đủ điều kiện phẫu thuật',
    0.1, 0.1, 0.8, 0.7,
    NULL, NULL, NULL, 16.0,
    NULL, NULL, NULL, 15.5,
    15180000, DATEADD(DAY,-2,GETDATE()), 5, 'COMPLETED', DATEADD(DAY,-2,GETDATE()));

SET IDENTITY_INSERT medical_records OFF;
GO

-- ============================================================================
-- 11. prescriptions + prescription_items (đơn thuốc cho MR2 — đã phát)
-- ============================================================================
SET IDENTITY_INSERT prescriptions ON;

INSERT INTO prescriptions (id, medical_record_id, doctor_id, patient_id, status, notes, created_at)
VALUES
(1, 2, 1, 2, 'DISPENSED',
    N'Nhỏ kháng sinh sáng-tối, nhỏ chống viêm trưa-chiều trong 7 ngày.',
    DATEADD(DAY,-3,GETDATE()));

SET IDENTITY_INSERT prescriptions OFF;
GO

SET IDENTITY_INSERT prescription_items ON;

INSERT INTO prescription_items
    (id, prescription_id, medicine_id, quantity, dosage, frequency, duration, instructions, unit_price)
VALUES
(1, 1, 1, 2, N'1 giọt/mắt', N'Sáng và tối',       7, N'Nhỏ sau khi rửa mặt sạch', 45000),
(2, 1, 2, 1, N'1 giọt/mắt', N'Trưa và chiều tối', 5, NULL,                        38000);

SET IDENTITY_INSERT prescription_items OFF;
GO

-- ============================================================================
-- 12. eyeglass_prescriptions — đơn kính (OD = mắt phải, OS = mắt trái)
-- ============================================================================
SET IDENTITY_INSERT eyeglass_prescriptions ON;

INSERT INTO eyeglass_prescriptions
    (id, medical_record_id, doctor_id, patient_id,
     od_sph, od_cyl, od_axis, od_add, os_sph, os_cyl, os_axis, os_add,
     pd, lens_type, notes, status, created_at)
VALUES
-- Đơn kính MR1 — đã phát
(1, 1, 1, 1,
    -3.00, -0.75, 175, NULL, -2.50, -0.50, 180, NULL,
    63.5, N'Đơn tròng Polycarbonate 1.60',
    N'Kính cận đơn tròng, phủ chống UV + chống phản chiếu.', 'DISPENSED', DATEADD(DAY,-3,GETDATE())),

-- Đơn kính MR3 — chờ phát
(2, 3, 2, 3,
    -3.25, -0.50, 165, NULL, -2.75, -0.50, 170, NULL,
    62.0, N'Đơn tròng',
    N'Cận + loạn nhẹ. Tư vấn thêm kính áp tròng toric.', 'PENDING', DATEADD(DAY,-3,GETDATE()));

SET IDENTITY_INSERT eyeglass_prescriptions OFF;
GO

-- ============================================================================
-- 13. lab_orders — LƯU Ý: ordered_by = doctors.id, assigned_to = lab_technicians.id
-- ============================================================================
SET IDENTITY_INSERT lab_orders ON;

INSERT INTO lab_orders
    (id, medical_record_id, ordered_by, assigned_to, notes, priority, status, completed_at, created_at)
VALUES
-- XN tiền phẫu cho MR4 — bác sĩ 3 chỉ định, KTV 1 thực hiện, đã duyệt
(1, 4, 3, 1, N'Xét nghiệm tiền phẫu: sinh hóa máu. Ưu tiên trả kết quả trong ngày.',
    'EMERGENCY', 'APPROVED', DATEADD(DAY,-2,GETDATE()), DATEADD(DAY,-2,GETDATE())),

-- Chụp OCT cho MR1 — đã duyệt
(2, 1, 1, 1, N'Chụp OCT hoàng điểm để loại trừ thoái hóa hoàng điểm.',
    'PRIMARY', 'APPROVED', DATEADD(DAY,-3,GETDATE()), DATEADD(DAY,-3,GETDATE())),

-- Soi đáy mắt cho MR2 — đang chờ tiếp nhận
(3, 2, 1, 1, N'Soi đáy mắt loại trừ viêm màng bồ đào.',
    'PRIMARY', 'PENDING', NULL, DATEADD(DAY,-3,GETDATE()));

SET IDENTITY_INSERT lab_orders OFF;
GO

-- ============================================================================
-- 14. lab_results — uploaded_by = lab_technicians.id, reviewed_by = doctors.id
-- ============================================================================
SET IDENTITY_INSERT lab_results ON;

INSERT INTO lab_results
    (id, lab_order_id,
     va_l, va_r, bcva_l, bcva_r, iop_l, iop_r,
     doctor_notes, uploaded_by, reviewed_by, reviewed_at, created_at)
VALUES
-- Kết quả XN sinh hóa (lab order 1) — chỉ số ghi ở doctor_notes
(1, 1,
    NULL, NULL, NULL, NULL, NULL, NULL,
    N'Sinh hóa máu tiền phẫu: glucose 5.2 mmol/L, cholesterol 4.8 mmol/L, HbA1c 5.4%. Trong giới hạn bình thường — an toàn để phẫu thuật.',
    1, 3, DATEADD(DAY,-2,GETDATE()), DATEADD(DAY,-2,GETDATE())),

-- Kết quả OCT (lab order 2)
(2, 2,
    0.6, 0.5, 1.0, 1.0, 14.0, 13.5,
    N'OCT hoàng điểm bình thường, độ dày võng mạc trung tâm 260µm, không phù hoàng điểm. Không cần can thiệp thêm.',
    1, 1, DATEADD(DAY,-3,GETDATE()), DATEADD(DAY,-3,GETDATE()));

SET IDENTITY_INSERT lab_results OFF;
GO

-- ============================================================================
-- 15. invoices + invoice_details (cho 4 lịch hẹn COMPLETED)
-- ============================================================================
SET IDENTITY_INSERT invoices ON;

INSERT INTO invoices
    (id, appointment_id, patient_id, invoice_code,
     service_fee, lab_fee, medicine_fee, sub_total, discount_amount, tax, total_amount,
     payment_method, payment_status, issued_by, paid_at, generated_at, status, created_at)
VALUES
-- HĐ1: khám tổng quát 200k + chụp OCT 350k
(1, 1, 1, N'INV-2026-0001', 200000, 350000, 0, 550000, 0, 0, 550000,
    'CASH',    'PAID', 6, DATEADD(DAY,-3,GETDATE()), DATEADD(DAY,-3,GETDATE()), 'ISSUED', DATEADD(DAY,-3,GETDATE())),

-- HĐ2: khám 200k + thuốc 128k
(2, 2, 2, N'INV-2026-0002', 200000, 0, 128000, 328000, 0, 0, 328000,
    'VIET_QR', 'PAID', 6, DATEADD(DAY,-3,GETDATE()), DATEADD(DAY,-3,GETDATE()), 'ISSUED', DATEADD(DAY,-3,GETDATE())),

-- HĐ3: đo khúc xạ 100k
(3, 3, 3, N'INV-2026-0003', 100000, 0, 0, 100000, 0, 0, 100000,
    'CASH',    'PAID', 7, DATEADD(DAY,-3,GETDATE()), DATEADD(DAY,-3,GETDATE()), 'ISSUED', DATEADD(DAY,-3,GETDATE())),

-- HĐ4: phẫu thuật 15tr + XN tiền phẫu 180k
(4, 4, 4, N'INV-2026-0004', 15000000, 180000, 0, 15180000, 0, 0, 15180000,
    'VIET_QR', 'PAID', 6, DATEADD(DAY,-2,GETDATE()), DATEADD(DAY,-2,GETDATE()), 'ISSUED', DATEADD(DAY,-2,GETDATE()));

SET IDENTITY_INSERT invoices OFF;
GO

SET IDENTITY_INSERT invoice_details ON;

INSERT INTO invoice_details
    (id, invoice_id, item_type, ref_id, description, quantity, unit_price, sub_total, status, created_at)
VALUES
-- HĐ1
(1, 1, 'SERVICE',  9,  N'Khám tổng quát mắt',              1, 200000,   200000,   'ACTIVE', DATEADD(DAY,-3,GETDATE())),
(2, 1, 'SERVICE',  14, N'Chụp OCT võng mạc',               1, 350000,   350000,   'ACTIVE', DATEADD(DAY,-3,GETDATE())),
-- HĐ2
(3, 2, 'SERVICE',  9,  N'Khám tổng quát mắt',              1, 200000,   200000,   'ACTIVE', DATEADD(DAY,-3,GETDATE())),
(4, 2, 'MEDICINE', 1,  N'Tobramycin 0.3% nhỏ mắt x 2 lọ',  2, 45000,    90000,    'ACTIVE', DATEADD(DAY,-3,GETDATE())),
(5, 2, 'MEDICINE', 2,  N'Dexamethasone 0.1% nhỏ mắt x 1 lọ', 1, 38000,  38000,    'ACTIVE', DATEADD(DAY,-3,GETDATE())),
-- HĐ3
(6, 3, 'SERVICE',  11, N'Đo khúc xạ tự động',              1, 100000,   100000,   'ACTIVE', DATEADD(DAY,-3,GETDATE())),
-- HĐ4
(7, 4, 'SERVICE',  8,  N'Phẫu thuật đục thủy tinh thể',    1, 15000000, 15000000, 'ACTIVE', DATEADD(DAY,-2,GETDATE())),
(8, 4, 'SERVICE',  7,  N'Xét nghiệm sinh hóa máu cơ bản',  1, 180000,   180000,   'ACTIVE', DATEADD(DAY,-2,GETDATE()));

SET IDENTITY_INSERT invoice_details OFF;
GO

-- ============================================================================
-- 16. patient_service_subscriptions + care_sessions (gói CARE đã mua)
-- ============================================================================
SET IDENTITY_INSERT patient_service_subscriptions ON;

INSERT INTO patient_service_subscriptions
    (id, patient_id, service_id, total_sessions, used_sessions, purchase_date, expiry_date,
     status, discount_id, final_price, notes, created_at)
VALUES
-- BN1 mua gói Chăm Sóc Toàn Diện (10 buổi/60 ngày), đã dùng 2 buổi + 1 buổi đã đặt
(1, 1, 3, 10, 3, CAST(DATEADD(DAY,-20,GETDATE()) AS DATE), CAST(DATEADD(DAY,40,GETDATE()) AS DATE),
    'ACTIVE', NULL, 1500000, NULL, DATEADD(DAY,-20,GETDATE())),

-- BN2 mua gói Massage Mắt (8 buổi/45 ngày) với voucher SUMMER10
(2, 2, 2, 8, 0, CAST(DATEADD(DAY,-5,GETDATE()) AS DATE), CAST(DATEADD(DAY,40,GETDATE()) AS DATE),
    'ACTIVE', 1, 225000, N'Áp dụng voucher SUMMER10 (giảm 10%)', DATEADD(DAY,-5,GETDATE()));

SET IDENTITY_INSERT patient_service_subscriptions OFF;
GO

SET IDENTITY_INSERT care_sessions ON;

DECLARE @cs_m14 DATETIME2 = DATEADD(MINUTE, 10*60, CAST(CAST(DATEADD(DAY,-14,GETDATE()) AS DATE) AS DATETIME2));
DECLARE @cs_m7  DATETIME2 = DATEADD(MINUTE, 10*60, CAST(CAST(DATEADD(DAY,-7, GETDATE()) AS DATE) AS DATETIME2));
DECLARE @cs_p2  DATETIME2 = DATEADD(MINUTE, 10*60, CAST(CAST(DATEADD(DAY, 2, GETDATE()) AS DATE) AS DATETIME2));

INSERT INTO care_sessions
    (id, subscription_id, patient_id, nurse_id, scheduled_date_time, status, session_number,
     notes, nurse_notes, completed_at, assigned_at, created_at)
VALUES
(1, 1, 1, 15, @cs_m14, 'COMPLETED', 1,
    NULL, N'Buổi đầu: kiểm tra thị lực + massage 30 phút, bệnh nhân phản hồi tốt.',
    DATEADD(MINUTE, 60, @cs_m14), DATEADD(DAY,-15,GETDATE()), DATEADD(DAY,-15,GETDATE())),

(2, 1, 1, 15, @cs_m7,  'COMPLETED', 2,
    NULL, N'Buổi 2: chiếu đèn hồng ngoại, hướng dẫn bài tập điều tiết tại nhà.',
    DATEADD(MINUTE, 60, @cs_m7),  DATEADD(DAY,-8,GETDATE()),  DATEADD(DAY,-8,GETDATE())),

(3, 1, 1, NULL, @cs_p2, 'BOOKED', 3,
    N'Bệnh nhân đặt buổi 3 qua app', NULL,
    NULL, NULL, GETDATE());

SET IDENTITY_INSERT care_sessions OFF;
GO

-- ============================================================================
-- 17. service_registrations (UC-46 — lễ tân đăng ký dịch vụ cho bệnh nhân)
-- ============================================================================
SET IDENTITY_INSERT service_registrations ON;

INSERT INTO service_registrations
    (id, service_id, patient_id, registered_by, registration_date, status, notes, created_at)
VALUES
(1, 1, 4, 6, CAST(GETDATE() AS DATE),               'PENDING',   N'Bệnh nhân muốn trải nghiệm thử gói thiền mắt.', GETDATE()),
(2, 4, 5, 6, CAST(DATEADD(DAY,1,GETDATE()) AS DATE),'CONFIRMED', NULL, GETDATE());

SET IDENTITY_INSERT service_registrations OFF;
GO

-- ============================================================================
-- 18. notifications (UC-13 — 3 broadcast lễ tân + 2 nhắm riêng bệnh nhân)
-- ============================================================================
SET IDENTITY_INSERT notifications ON;

INSERT INTO notifications
    (id, message, target_role, target_user_id, related_appointment_id, is_read, created_at)
VALUES
(1, N'Đã gửi nhắc lịch cho bệnh nhân Bùi Văn Bình',    N'RECEPTIONIST', NULL, 7, 0, GETDATE()),
(2, N'Đã gửi nhắc lịch cho bệnh nhân Đinh Thị Hoa',    N'RECEPTIONIST', NULL, 8, 0, GETDATE()),
(3, N'Bệnh nhân Tô Văn Dũng đã check-in, đang chờ khám', N'RECEPTIONIST', NULL, 5, 1, GETDATE()),
(4, N'Bạn có lịch khám sắp tới. Nhấn để xem chi tiết lịch hẹn.', NULL, 10, 7, 0, GETDATE()),
(5, N'Bạn có lịch khám sắp tới. Nhấn để xem chi tiết lịch hẹn.', NULL, 11, 8, 0, GETDATE());

SET IDENTITY_INSERT notifications OFF;
GO

-- ============================================================================
-- 19. blog_posts (tác giả: 3 bác sĩ)
-- ============================================================================
SET IDENTITY_INSERT blog_posts ON;

INSERT INTO blog_posts (id, title, slug, content, author_id, status, published_at, created_at)
VALUES
(1, N'5 Dấu hiệu cảnh báo bệnh tăng nhãn áp bạn không nên bỏ qua',
    N'5-dau-hieu-canh-bao-tang-nhan-ap',
    N'Tăng nhãn áp thường được gọi là "kẻ trộm thị giác" vì tiến triển âm thầm. Chú ý 5 dấu hiệu: (1) Mờ mắt thoáng qua, (2) Đau đầu phía trán, (3) Nhìn thấy quầng sáng quanh đèn, (4) Thu hẹp thị trường ngoại vi, (5) Buồn nôn kèm đau mắt. Khám nhãn áp định kỳ là cách phát hiện sớm hiệu quả nhất.',
    3, 'PUBLISHED', DATEADD(DAY,-10,GETDATE()), DATEADD(DAY,-12,GETDATE())),

(2, N'Kính áp tròng: Những điều cần biết để bảo vệ mắt',
    N'kinh-ap-trong-nhung-dieu-can-biet',
    N'Kính áp tròng tiện lợi nhưng sử dụng sai cách rất nguy hiểm. Nguyên tắc vàng: (1) Rửa tay trước khi đeo/tháo, (2) Không đeo khi ngủ, (3) Không dùng nước máy thay nước muối rửa kính, (4) Thay kính đúng chu kỳ, (5) Tháo ngay khi mắt đỏ hoặc đau.',
    4, 'PUBLISHED', DATEADD(DAY,-5,GETDATE()), DATEADD(DAY,-7,GETDATE())),

(3, N'Phẫu thuật Phaco điều trị đục thể thủy tinh — Quy trình và kết quả',
    N'phau-thuat-phaco-duc-the-thuy-tinh',
    N'Đục thể thủy tinh là nguyên nhân hàng đầu gây mù lòa có thể phòng ngừa. Phẫu thuật Phaco chỉ mất 15-20 phút, không cần nằm viện, bệnh nhân phục hồi thị lực trong 24-48 giờ. Bài viết này giải thích chi tiết quy trình và những điều cần chuẩn bị.',
    5, 'DRAFT', NULL, DATEADD(DAY,-1,GETDATE()));

SET IDENTITY_INSERT blog_posts OFF;
GO

-- ============================================================================
-- 20. verification_tokens (1 token đã dùng, 1 token còn hiệu lực)
-- ============================================================================
SET IDENTITY_INSERT verification_tokens ON;

INSERT INTO verification_tokens (id, user_id, token_hash, type, expires_at, used, created_at)
VALUES
(1, 11, N'd4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5',
    'PASSWORD_RESET', DATEADD(HOUR, 1, DATEADD(DAY,-2,GETDATE())), 1, DATEADD(DAY,-2,GETDATE())),

(2, 12, N'e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6',
    'EMAIL_VERIFY', DATEADD(HOUR, 24, GETDATE()), 0, GETDATE());

SET IDENTITY_INSERT verification_tokens OFF;
GO

-- ============================================================================
-- 21. audit_logs (entity_id là chuỗi)
-- ============================================================================
SET IDENTITY_INSERT audit_logs ON;

INSERT INTO audit_logs
    (id, user_id, action, entity_type, entity_id, old_value, new_value, ip_address, created_at)
VALUES
(1, 1, N'CREATE', N'users', N'14',
    NULL,
    N'{"email":"patient5@gmail.com","role":"PATIENT","status":"ACTIVE"}',
    N'192.168.1.1',  DATEADD(DAY,-7,GETDATE())),

(2, 12, N'UPDATE', N'appointments', N'9',
    N'{"status":"PENDING"}',
    N'{"status":"CANCELLED","cancel_reason":"Bệnh nhân bận việc đột xuất"}',
    N'192.168.1.10', GETDATE()),

(3, 3, N'UPDATE', N'medical_records', N'1',
    N'{"status":"IN_PROGRESS"}',
    N'{"status":"COMPLETED","locked_by":3}',
    N'192.168.1.20', DATEADD(DAY,-3,GETDATE())),

(4, 8, N'UPDATE', N'prescriptions', N'1',
    N'{"status":"PENDING"}',
    N'{"status":"DISPENSED"}',
    N'192.168.1.30', DATEADD(DAY,-3,GETDATE())),

(5, 1, N'UPDATE', N'system_configs', N'1',
    N'{"config_value":"30"}',
    N'{"config_value":"30"}',
    N'192.168.1.1',  DATEADD(DAY,-1,GETDATE()));

SET IDENTITY_INSERT audit_logs OFF;
GO

-- ============================================================================
-- 22. doctor_schedules (bảng dự phòng — ca làm việc vài ngày tới)
-- ============================================================================
SET IDENTITY_INSERT doctor_schedules ON;

INSERT INTO doctor_schedules
    (id, doctor_id, work_date, slot_start, slot_end, max_slot, booked_slot, status, created_at)
VALUES
(1, 1, CAST(GETDATE() AS DATE),               '07:30', '11:30', 10, 2, 'AVAILABLE', GETDATE()),
(2, 1, CAST(DATEADD(DAY,1,GETDATE()) AS DATE),'07:30', '11:30', 10, 1, 'AVAILABLE', GETDATE()),
(3, 1, CAST(DATEADD(DAY,2,GETDATE()) AS DATE),'13:00', '17:00', 10, 0, 'AVAILABLE', GETDATE()),
(4, 2, CAST(DATEADD(DAY,1,GETDATE()) AS DATE),'07:30', '11:30',  8, 1, 'AVAILABLE', GETDATE()),
(5, 2, CAST(DATEADD(DAY,3,GETDATE()) AS DATE),'13:00', '17:00',  8, 0, 'AVAILABLE', GETDATE()),
(6, 3, CAST(DATEADD(DAY,2,GETDATE()) AS DATE),'07:30', '11:30',  6, 1, 'AVAILABLE', GETDATE()),
(7, 3, CAST(DATEADD(DAY,4,GETDATE()) AS DATE),'13:00', '17:00',  6, 0, 'AVAILABLE', GETDATE());

SET IDENTITY_INSERT doctor_schedules OFF;
GO

-- ============================================================================
-- 23. feedbacks (bảng dự phòng — đánh giá sau khám)
-- ============================================================================
SET IDENTITY_INSERT feedbacks ON;

INSERT INTO feedbacks
    (id, patient_id, appointment_id, doctor_id, rating, content, is_anonymous, status, created_at)
VALUES
(1, 1, 1, 1, 5,
    N'Bác sĩ rất tận tâm, giải thích rõ ràng. Phòng khám sạch sẽ, nhân viên thân thiện!',
    0, 'APPROVED', DATEADD(DAY,-2,GETDATE())),

(2, 2, 2, 1, 4,
    N'Bác sĩ khám kỹ, dặn dò chi tiết. Chờ hơi lâu nhưng chấp nhận được.',
    0, 'APPROVED', DATEADD(DAY,-2,GETDATE())),

(3, 4, 4, 3, 5,
    N'Ca phẫu thuật diễn ra thuận lợi, ê-kíp rất chuyên nghiệp. Phục hồi thị lực tốt sau 1 ngày.',
    1, 'PENDING', DATEADD(DAY,-1,GETDATE()));

SET IDENTITY_INSERT feedbacks OFF;
GO

-- ============================================================================
-- Tóm tắt
-- ============================================================================
PRINT N'';
PRINT N'✅ ECMS Seed Data hoàn tất!';
PRINT N'';
PRINT N'  users                         : 15 (9 nhân viên + 1 manager... + 5 bệnh nhân)';
PRINT N'  doctors                       : 3   | lab_technicians : 1 | staffs : 4';
PRINT N'  patients                      : 6 (5 có tài khoản + 1 bệnh nhi vãng lai)';
PRINT N'  services                      : 14 (5 CARE + 9 CLINICAL) | categories : 4';
PRINT N'  medicines                     : 6   | discount_campaigns : 2';
PRINT N'  appointments                  : 9 (đủ trạng thái) | medical_records : 4';
PRINT N'  prescriptions                 : 1 (+2 items) | eyeglass_prescriptions : 2';
PRINT N'  lab_orders                    : 3   | lab_results : 2';
PRINT N'  invoices                      : 4 (+8 details, tất cả PAID)';
PRINT N'  subscriptions                 : 2 (+3 care_sessions) | service_registrations : 2';
PRINT N'  notifications                 : 5   | blog_posts : 3 | audit_logs : 5';
PRINT N'  doctor_schedules              : 7   | feedbacks : 3 | verification_tokens : 2';
PRINT N'';
PRINT N'  ─── TÀI KHOẢN ĐĂNG NHẬP (mật khẩu chung: Password@123) ───';
PRINT N'  ADMIN         : mh3k42k6@gmail.com';
PRINT N'  RECEPTIONIST  : bichngan1826@gmail.com  (+ reception2@ecms.vn)';
PRINT N'  NURSE         : andreale389@gmail.com';
PRINT N'  MANAGER       : manager@ecms.vn';
PRINT N'  DOCTOR        : doctor.nguyen@ecms.vn / doctor.tran@ecms.vn / doctor.le@ecms.vn';
PRINT N'  PHARMACIST    : pharmacist@ecms.vn';
PRINT N'  LAB_TECH      : labtech@ecms.vn';
PRINT N'  PATIENT (ảo)  : patient1@gmail.com … patient5@gmail.com';
GO
