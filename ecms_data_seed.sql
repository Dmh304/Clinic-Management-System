-- ============================================================
-- ECMS — Seed Data for CRUD Testing
-- Chạy SAU ecms_schema.sql (roles & system_configs đã có sẵn)
-- Mật khẩu mặc định tất cả tài khoản: Password@123
-- ============================================================

USE ecms_db;
GO
SET QUOTED_IDENTIFIER ON;
GO

-- ============================================================
-- 1. users
-- 15 users: 1 admin, 1 manager, 3 doctor, 2 receptionist,
--           1 pharmacist, 1 lab_tech, 1 nurse, 5 patient
-- Không insert google_id → NULL (filtered index ở schema.sql cho phép nhiều NULL)
-- ============================================================
SET IDENTITY_INSERT users ON;

INSERT INTO users
    (id, email, password, full_name, phone_number, date_of_birth,
     gender, address, email_verified_at, status, enabled, role_id, created_at)
VALUES
(1,  N'admin@ecms.vn',          N'$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL536lW',
     N'Nguyễn Quản Trị',      N'0901000001', '1985-03-15', 'MALE',
     N'1 Lê Lợi, Q1, TP.HCM',              GETDATE(), 'ACTIVE', 1, 1, GETDATE()),

(2,  N'manager@ecms.vn',        N'$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL536lW',
     N'Trần Thị Quản Lý',     N'0901000002', '1988-07-20', 'FEMALE',
     N'2 Nguyễn Huệ, Q1, TP.HCM',          GETDATE(), 'ACTIVE', 1, 2, GETDATE()),

(3,  N'doctor.nguyen@ecms.vn',  N'$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL536lW',
     N'BS. Nguyễn Văn An',    N'0901000003', '1980-01-10', 'MALE',
     N'3 Pasteur, Q3, TP.HCM',              GETDATE(), 'ACTIVE', 1, 3, GETDATE()),

(4,  N'doctor.tran@ecms.vn',    N'$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL536lW',
     N'BS. Trần Thị Bình',    N'0901000004', '1983-05-25', 'FEMALE',
     N'4 Đinh Tiên Hoàng, Q1, TP.HCM',     GETDATE(), 'ACTIVE', 1, 3, GETDATE()),

(5,  N'doctor.le@ecms.vn',      N'$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL536lW',
     N'BS. Lê Minh Châu',     N'0901000005', '1979-11-08', 'MALE',
     N'5 Võ Văn Tần, Q3, TP.HCM',          GETDATE(), 'ACTIVE', 1, 3, GETDATE()),

(6,  N'reception1@ecms.vn',     N'$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL536lW',
     N'Phạm Lễ Tân Một',      N'0901000006', '1995-04-12', 'FEMALE',
     N'6 Bạch Đằng, Q.BT, TP.HCM',         GETDATE(), 'ACTIVE', 1, 4, GETDATE()),

(7,  N'reception2@ecms.vn',     N'$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL536lW',
     N'Hoàng Lễ Tân Hai',     N'0901000007', '1997-09-30', 'MALE',
     N'7 Cộng Hòa, Q.TB, TP.HCM',          GETDATE(), 'ACTIVE', 1, 4, GETDATE()),

(8,  N'pharmacist@ecms.vn',     N'$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL536lW',
     N'Vũ Dược Sĩ',           N'0901000008', '1990-06-18', 'FEMALE',
     N'8 Tô Hiến Thành, Q10, TP.HCM',      GETDATE(), 'ACTIVE', 1, 5, GETDATE()),

(9,  N'labtech@ecms.vn',        N'$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL536lW',
     N'Đặng Kỹ Thuật Viên',   N'0901000009', '1993-02-22', 'MALE',
     N'9 Nguyễn Thị Minh Khai, Q3',        GETDATE(), 'ACTIVE', 1, 6, GETDATE()),

(10, N'patient1@gmail.com',     N'$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL536lW',
     N'Bùi Văn Bệnh Nhân',    N'0912000001', '1990-03-10', 'MALE',
     N'10 Lý Thường Kiệt, Q10, TP.HCM',    GETDATE(), 'ACTIVE', 1, 7, GETDATE()),

(11, N'patient2@gmail.com',     N'$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL536lW',
     N'Đinh Thị Hoa',         N'0912000002', '1995-08-15', 'FEMALE',
     N'11 Trần Hưng Đạo, Q5, TP.HCM',      GETDATE(), 'ACTIVE', 1, 7, GETDATE()),

(12, N'patient3@gmail.com',     N'$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL536lW',
     N'Lý Văn Minh',          N'0912000003', '1982-12-05', 'MALE',
     N'12 An Dương Vương, Q5, TP.HCM',      GETDATE(), 'ACTIVE', 1, 7, GETDATE()),

(13, N'patient4@gmail.com',     N'$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL536lW',
     N'Ngô Thị Lan',          N'0912000004', '2000-05-20', 'FEMALE',
     N'13 Nguyễn Văn Cừ, Q5, TP.HCM',      GETDATE(), 'ACTIVE', 1, 7, GETDATE()),

(14, N'patient5@gmail.com',     N'$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL536lW',
     N'Tô Văn Dũng',          N'0912000005', '1975-07-07', 'MALE',
     N'14 Hùng Vương, Q6, TP.HCM',          GETDATE(), 'ACTIVE', 1, 7, GETDATE()),

(15, N'nurse.le@ecms.vn',       N'$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL536lW',
     N'Lê Thị Điều Dưỡng',    N'0901000099', '1992-04-10', 'FEMALE',
     N'15 Lê Văn Sỹ, Q3, TP.HCM',           GETDATE(), 'ACTIVE', 1, 7, GETDATE());

SET IDENTITY_INSERT users OFF;
GO

-- ============================================================
-- (Đã loại bỏ seed cho user_roles — vai trò của mỗi user đã được
--  gán trực tiếp qua cột users.role_id ở bước insert "users" trên.
--  roles: ADMIN=1, MANAGER=2, DOCTOR=3, RECEPTIONIST=4,
--         PHARMACIST=5, LAB_TECHNICIAN=6, NURSE=7, PATIENT=8)
-- ============================================================

-- ============================================================
-- 3. doctors  (user_id 3, 4, 5)
-- ============================================================
SET IDENTITY_INSERT doctors ON;

INSERT INTO doctors
    (id, user_id, doctor_code, full_name, license_number, specialty,
     department, phone_number, email, experience_years, bio, status, created_at)
VALUES
(1, 3, N'DR001', N'BS. Nguyễn Văn An',
    N'BV-HCM-001234', N'Khoa mắt tổng quát',    N'Phòng khám tổng quát',
    N'0901000003', N'doctor.nguyen@ecms.vn', 12,
    N'Chuyên gia khám và điều trị các bệnh mắt thông thường.', 'ACTIVE', GETDATE()),

(2, 4, N'DR002', N'BS. Trần Thị Bình',
    N'BV-HCM-005678', N'Khúc xạ & Kính áp tròng', N'Phòng khúc xạ',
    N'0901000004', N'doctor.tran@ecms.vn',   9,
    N'Chuyên điều trị tật khúc xạ, tư vấn kính áp tròng.', 'ACTIVE', GETDATE()),

(3, 5, N'DR003', N'BS. Lê Minh Châu',
    N'BV-HCM-009012', N'Phẫu thuật mắt',         N'Phòng phẫu thuật',
    N'0901000005', N'doctor.le@ecms.vn',     15,
    N'Bác sĩ phẫu thuật đục thủy tinh thể và Lasik.', 'ACTIVE', GETDATE());

SET IDENTITY_INSERT doctors OFF;
GO

-- ============================================================
-- 4. staffs  (user_id 6, 7, 8, 9)
-- ============================================================
SET IDENTITY_INSERT staffs ON;

INSERT INTO staffs
    (id, user_id, employee_code, full_name, department, position,
     phone_number, hire_date, status, created_at)
VALUES
(1, 6, N'EMP001', N'Phạm Lễ Tân Một',    N'Lễ tân',     N'Lễ tân viên',       N'0901000006', '2022-01-15', 'ACTIVE', GETDATE()),
(2, 7, N'EMP002', N'Hoàng Lễ Tân Hai',   N'Lễ tân',     N'Lễ tân viên',       N'0901000007', '2023-03-01', 'ACTIVE', GETDATE()),
(3, 8, N'EMP003', N'Vũ Dược Sĩ',         N'Nhà thuốc',  N'Dược sĩ',           N'0901000008', '2021-06-10', 'ACTIVE', GETDATE()),
(4, 9, N'EMP004', N'Đặng Kỹ Thuật Viên', N'Xét nghiệm', N'Kỹ thuật viên XN',  N'0901000009', '2022-09-20', 'ACTIVE', GETDATE());

SET IDENTITY_INSERT staffs OFF;
GO

-- ============================================================
-- 5. patients  (user_id 10-14)
-- ============================================================
SET IDENTITY_INSERT patients ON;

INSERT INTO patients
    (id, user_id, patient_code, full_name, date_of_birth, gender, address,
     phone, email, cccd, blood_type, allergy_notes,
     emergency_contact_name, emergency_contact_phone, status, created_at)
VALUES
(1, 10, N'PAT001', N'Bùi Văn Bệnh Nhân', '1990-03-10', 'MALE',
    N'10 Lý Thường Kiệt, Q10', N'0912000001', N'patient1@gmail.com', N'079090001234',
    'O',       N'Dị ứng Penicillin',  N'Bùi Thị Mẹ',  N'0912100001', 'ACTIVE', GETDATE()),

(2, 11, N'PAT002', N'Đinh Thị Hoa',       '1995-08-15', 'FEMALE',
    N'11 Trần Hưng Đạo, Q5',  N'0912000002', N'patient2@gmail.com', N'079095002345',
    'A',       NULL,                   N'Đinh Văn Ba',  N'0912100002', 'ACTIVE', GETDATE()),

(3, 12, N'PAT003', N'Lý Văn Minh',        '1982-12-05', 'MALE',
    N'12 An Dương Vương, Q5', N'0912000003', N'patient3@gmail.com', N'079082003456',
    'B',       N'Dị ứng Sulfonamide', N'Lý Thị Vợ',   N'0912100003', 'ACTIVE', GETDATE()),

(4, 13, N'PAT004', N'Ngô Thị Lan',        '2000-05-20', 'FEMALE',
    N'13 Nguyễn Văn Cừ, Q5', N'0912000004', N'patient4@gmail.com', N'079000004567',
    'AB',      NULL,                   N'Ngô Văn Cha',  N'0912100004', 'ACTIVE', GETDATE()),

(5, 14, N'PAT005', N'Tô Văn Dũng',        '1975-07-07', 'MALE',
    N'14 Hùng Vương, Q6',     N'0912000005', N'patient5@gmail.com', N'079075005678',
    'UNKNOWN', N'Cao huyết áp',       N'Tô Thị Vợ',   N'0912100005', 'ACTIVE', GETDATE());

SET IDENTITY_INSERT patients OFF;
GO

-- ============================================================
-- 5.5 service_categories
-- ============================================================
SET IDENTITY_INSERT service_categories ON;
INSERT INTO service_categories (id, name, slug, display_order) VALUES
(1, N'Thư giãn mắt', 'thu-gian-mat', 1),
(2, N'Trị liệu mắt', 'tri-lieu-mat', 2),
(3, N'Chăm sóc toàn diện', 'cham-soc-toan-dien', 3),
(4, N'Phục hồi thị lực', 'phuc-hoi-thi-luc', 4);
SET IDENTITY_INSERT service_categories OFF;
GO

-- ============================================================
-- 6. services
-- service_type: CARE (id 1-5, chăm sóc/thư giãn — hiện ở trang dịch vụ công khai)
--               CLINICAL (id 6-14, khám/chẩn đoán/phẫu thuật — hiện ở lịch khám vãng lai)
-- ============================================================
SET IDENTITY_INSERT services ON;

INSERT INTO services
    (id, name, price, duration_minutes, thumbnail_url, description, status,
     badge, price_label, sessions_included, validity_days, service_type, is_active, display_order, category_id, slug, content, created_at)
VALUES
(1, N'Gói Thiền Mắt', 350000, 45,
    'https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=600&h=360&fit=crop&auto=format',
    N'Liệu trình thiền và thư giãn cho mắt, giảm căng thẳng thị giác sau thời gian dài sử dụng màn hình. Kết hợp bài tập yoga mắt và kỹ thuật hít thở.',
    'ACTIVE', N'Mới', N'Giá chỉ từ', 5, 30, 'CARE', 1, 1, 1, 'goi-thien-mat', N'Chi tiết gói thiền mắt...', GETDATE()),

(2, N'Gói Massage Mắt', 250000, 30,
    'https://images.unsplash.com/photo-1616394584738-fc6e612e71b9?w=600&h=360&fit=crop&auto=format',
    N'Massage vùng mắt chuyên nghiệp bằng tay kết hợp tinh dầu thiên nhiên, giúp lưu thông máu và giảm quầng thâm mắt.',
    'ACTIVE', N'Phổ biến', N'Giá chỉ từ', 8, 45, 'CARE', 1, 2, 2, 'goi-massage-mat', N'Chi tiết gói massage mắt...', GETDATE()),

(3, N'Gói Chăm Sóc Mắt Toàn Diện', 1500000, 60,
    'https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=600&h=360&fit=crop&auto=format',
    N'Gói chăm sóc mắt toàn diện gồm kiểm tra thị lực, massage mắt, chiếu đèn hồng ngoại, và tư vấn chế độ dinh dưỡng cho mắt.',
    'ACTIVE', N'Best Seller', N'Giá trọn gói', 10, 60, 'CARE', 1, 3, 3, 'goi-cham-soc-mat-toan-dien', N'Chi tiết gói chăm sóc mắt toàn diện...', GETDATE()),

(4, N'Gói Thư Giãn Mắt Công Nghệ Cao', 500000, 40,
    'https://images.unsplash.com/photo-1573497491765-dccce02b29df?w=600&h=360&fit=crop&auto=format',
    N'Sử dụng thiết bị công nghệ cao: máy massage mắt áp suất khí, rung, nhiệt hồng ngoại và nhạc thư giãn để phục hồi mắt mệt mỏi.',
    'ACTIVE', N'Premium', N'Giá chỉ từ', 6, 30, 'CARE', 1, 4, 1, 'goi-thu-gian-mat-cong-nghe-cao', N'Chi tiết gói thư giãn mắt công nghệ cao...', GETDATE()),

(5, N'Liệu Trình Phục Hồi Thị Lực', 2800000, 90,
    'https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=600&h=360&fit=crop&auto=format',
    N'Liệu trình chuyên sâu kết hợp các bài tập điều tiết mắt đặc biệt và thiền định sâu để phục hồi thị lực tự nhiên.',
    'ACTIVE', N'Cao cấp', N'Giá trọn gói', 12, 90, 'CARE', 1, 5, 4, 'lieu-trinh-phuc-hoi-thi-luc', N'Chi tiết liệu trình phục hồi thị lực...', GETDATE()),

-- Dịch vụ khám/chẩn đoán/phẫu thuật — dùng cho lịch khám vãng lai (RECEPTIONIST)
(6, N'Chụp bản đồ giác mạc (Topo)', 250000, 20, NULL, N'Phân tích hình thái giác mạc bằng máy Topographer.', 'ACTIVE', NULL, NULL, NULL, NULL, 'CLINICAL', 1, 6, NULL, NULL, NULL, GETDATE()),
(7, N'Xét nghiệm sinh hóa máu cơ bản', 180000, 60, NULL, N'Xét nghiệm đường huyết, mỡ máu phục vụ tiền phẫu.', 'ACTIVE', NULL, NULL, NULL, NULL, 'CLINICAL', 1, 7, NULL, NULL, NULL, GETDATE()),
(8, N'Phẫu thuật đục thủy tinh thể', 15000000, 90, NULL, N'Phẫu thuật Phaco thay thể thủy tinh nhân tạo.', 'ACTIVE', NULL, NULL, NULL, NULL, 'CLINICAL', 1, 8, NULL, NULL, NULL, GETDATE()),
(9, N'Khám tổng quát mắt', 200000, 30, NULL, N'Khám đánh giá tổng thể sức khỏe mắt.', 'ACTIVE', NULL, NULL, NULL, NULL, 'CLINICAL', 1, 9, NULL, NULL, NULL, GETDATE()),
(10, N'Đo thị lực (VA/BCVA)', 80000, 10, NULL, N'Đo thị lực không kính và có kính chỉnh tốt nhất.', 'ACTIVE', NULL, NULL, NULL, NULL, 'CLINICAL', 1, 10, NULL, NULL, NULL, GETDATE()),
(11, N'Đo khúc xạ tự động', 100000, 15, NULL, N'Đo khúc xạ bằng máy Auto-Refractor.', 'ACTIVE', NULL, NULL, NULL, NULL, 'CLINICAL', 1, 11, NULL, NULL, NULL, GETDATE()),
(12, N'Đo nhãn áp (IOP)', 100000, 10, NULL, N'Đo áp lực nội nhãn bằng Tonometry.', 'ACTIVE', NULL, NULL, NULL, NULL, 'CLINICAL', 1, 12, NULL, NULL, NULL, GETDATE()),
(13, N'Soi đáy mắt', 150000, 20, NULL, N'Soi đáy mắt (Fundoscopy) đánh giá võng mạc.', 'ACTIVE', NULL, NULL, NULL, NULL, 'CLINICAL', 1, 13, NULL, NULL, NULL, GETDATE()),
(14, N'Chụp OCT', 350000, 20, NULL, N'Chụp cắt lớp quang học OCT võng mạc/thần kinh thị.', 'ACTIVE', NULL, NULL, NULL, NULL, 'CLINICAL', 1, 14, NULL, NULL, NULL, GETDATE());

SET IDENTITY_INSERT services OFF;
GO

-- ============================================================
-- 7. doctor_schedules
-- Dùng CAST(DATE AS DATETIME2) để tránh lỗi type mismatch.
-- Các ngày quá khứ FULL (cho appointments COMPLETED),
-- ngày tương lai AVAILABLE (cho test đặt lịch).
-- ============================================================
SET IDENTITY_INSERT doctor_schedules ON;

INSERT INTO doctor_schedules
    (id, doctor_id, work_date, slot_start, slot_end, max_slot, booked_slot, status, created_at)
VALUES
-- BS. Nguyễn Văn An (doctor_id=1)
(1,  1, CAST(DATEADD(DAY,-3, GETDATE()) AS DATE), '07:30', '11:30', 10, 10, 'FULL',      GETDATE()),
(2,  1, CAST(DATEADD(DAY,-1, GETDATE()) AS DATE), '13:00', '17:00', 10,  4, 'AVAILABLE', GETDATE()),
(3,  1, CAST(DATEADD(DAY, 1, GETDATE()) AS DATE), '07:30', '11:30', 10,  2, 'AVAILABLE', GETDATE()),
(4,  1, CAST(DATEADD(DAY, 2, GETDATE()) AS DATE), '13:00', '17:00', 10,  0, 'AVAILABLE', GETDATE()),
-- BS. Trần Thị Bình (doctor_id=2)
(5,  2, CAST(DATEADD(DAY,-3, GETDATE()) AS DATE), '07:30', '11:30',  8,  8, 'FULL',      GETDATE()),
(6,  2, CAST(DATEADD(DAY,-1, GETDATE()) AS DATE), '13:00', '17:00',  8,  2, 'AVAILABLE', GETDATE()),
(7,  2, CAST(DATEADD(DAY, 1, GETDATE()) AS DATE), '07:30', '11:30',  8,  1, 'AVAILABLE', GETDATE()),
(8,  2, CAST(DATEADD(DAY, 3, GETDATE()) AS DATE), '13:00', '17:00',  8,  0, 'AVAILABLE', GETDATE()),
-- BS. Lê Minh Châu (doctor_id=3)
(9,  3, CAST(DATEADD(DAY,-2, GETDATE()) AS DATE), '07:30', '11:30',  6,  6, 'FULL',      GETDATE()),
(10, 3, CAST(DATEADD(DAY, 2, GETDATE()) AS DATE), '07:30', '11:30',  6,  0, 'AVAILABLE', GETDATE()),
(11, 3, CAST(DATEADD(DAY, 4, GETDATE()) AS DATE), '13:00', '17:00',  6,  0, 'AVAILABLE', GETDATE());

SET IDENTITY_INSERT doctor_schedules OFF;
GO

-- ============================================================
-- 8. medicines
-- ============================================================
SET IDENTITY_INSERT medicines ON;

INSERT INTO medicines
    (id, name, unit, dosage_form, category, unit_price,
     requires_prescription, description, status, created_at)
VALUES
(1, N'Tobramycin 0.3% nhỏ mắt',      N'Lọ 5ml',     'DROP',   N'Kháng sinh nhỏ mắt',  45000, 1,
    N'Điều trị nhiễm khuẩn mắt.',                          'ACTIVE', GETDATE()),
(2, N'Dexamethasone 0.1% nhỏ mắt',   N'Lọ 5ml',     'DROP',   N'Chống viêm nhỏ mắt',  38000, 1,
    N'Giảm viêm, dị ứng mắt.',                             'ACTIVE', GETDATE()),
(3, N'Hylo-Comod nước mắt nhân tạo', N'Lọ 10ml',    'DROP',   N'Nước mắt nhân tạo',   85000, 0,
    N'Điều trị khô mắt.',                                  'ACTIVE', GETDATE()),
(4, N'Timolol 0.5% nhỏ mắt',         N'Lọ 5ml',     'DROP',   N'Hạ nhãn áp',          55000, 1,
    N'Điều trị tăng nhãn áp và glaucoma.',                 'ACTIVE', GETDATE()),
(5, N'Vitamin A 5000 IU',             N'Hộp 30 viên','TABLET', N'Vitamin',              30000, 0,
    N'Bổ sung Vitamin A, hỗ trợ thị lực.',                 'ACTIVE', GETDATE()),
(6, N'Ciprofloxacin 0.3% nhỏ mắt',   N'Lọ 5ml',     'DROP',   N'Kháng sinh nhỏ mắt',  42000, 1,
    N'Điều trị nhiễm khuẩn giác mạc, kết mạc.',           'ACTIVE', GETDATE());

SET IDENTITY_INSERT medicines OFF;
GO

-- ============================================================
-- 9. appointments
-- FIX: dùng DATEADD(MINUTE, ..., CAST(CAST(date) AS DATETIME2))
--      thay vì CAST(date) + 'HH:MM:SS' (không hợp lệ SQL Server)
--
-- Mapping thời gian:
--   CAST(CAST(DATEADD(DAY,N,GETDATE()) AS DATE) AS DATETIME2) = N ngày tính từ hôm nay, lúc 00:00
--   DATEADD(MINUTE, H*60+M, ...) = cộng thêm H giờ M phút
-- ============================================================
SET IDENTITY_INSERT appointments ON;

-- Dùng biến tạm để gọn code (tất cả trong 1 batch trước GO)
DECLARE @base_m3 DATETIME2 = CAST(CAST(DATEADD(DAY,-3, GETDATE()) AS DATE) AS DATETIME2);
DECLARE @base_m2 DATETIME2 = CAST(CAST(DATEADD(DAY,-2, GETDATE()) AS DATE) AS DATETIME2);
DECLARE @base_m1 DATETIME2 = CAST(CAST(DATEADD(DAY,-1, GETDATE()) AS DATE) AS DATETIME2);
DECLARE @base_p1 DATETIME2 = CAST(CAST(DATEADD(DAY, 1, GETDATE()) AS DATE) AS DATETIME2);
DECLARE @base_p2 DATETIME2 = CAST(CAST(DATEADD(DAY, 2, GETDATE()) AS DATE) AS DATETIME2);

INSERT INTO appointments
    (id, patient_id, doctor_id, service_id, appointment_time, type,
     notes, queue_number, check_in_time, check_in_by,
     cancel_reason, cancelled_by, cancelled_at, status, created_at)
VALUES
-- Đã hoàn thành → có medical_records, invoices
(1, 1, 1, 1, DATEADD(MINUTE,  7*60+45, @base_m3), 'ONLINE',
    N'Tập thiền mắt',      1, DATEADD(MINUTE,  7*60+40, @base_m3), 6,
    NULL, NULL, NULL, 'COMPLETED', DATEADD(DAY,-4,GETDATE())),

(2, 2, 1, 1, DATEADD(MINUTE,  8*60+30, @base_m3), 'WALK_IN',
    N'Thiền thư giãn mắt',      2, DATEADD(MINUTE,  8*60+25, @base_m3), 6,
    NULL, NULL, NULL, 'COMPLETED', DATEADD(DAY,-3,GETDATE())),

(3, 3, 2, 2, DATEADD(MINUTE,  9*60+0,  @base_m3), 'ONLINE',
    N'Massage mắt thảo dược',                 3, DATEADD(MINUTE,  8*60+55, @base_m3), 7,
    NULL, NULL, NULL, 'COMPLETED', DATEADD(DAY,-5,GETDATE())),

(4, 4, 3, 8, DATEADD(MINUTE,  7*60+30, @base_m2), 'ONLINE',
    N'Phẫu thuật đục TTT mắt phải', 1, DATEADD(MINUTE,  7*60+20, @base_m2), 6,
    NULL, NULL, NULL, 'COMPLETED', DATEADD(DAY,-7,GETDATE())),

-- Đang xử lý
(5, 5, 1, 5, DATEADD(MINUTE, 13*60+0,  @base_m1), 'WALK_IN',
    N'Liệu trình phục hồi thị lực',   1, DATEADD(MINUTE, 12*60+55, @base_m1), 6,
    NULL, NULL, NULL, 'IN_PROGRESS', DATEADD(DAY,-1,GETDATE())),

-- Đã xác nhận - ngày mai
(6, 1, 2, 2, DATEADD(MINUTE,  9*60+0,  @base_p1), 'ONLINE',
    N'Tái khám khúc xạ',           NULL, NULL, NULL,
    NULL, NULL, NULL, 'CONFIRMED', GETDATE()),

-- Chờ xác nhận - ngày kia
(7, 2, 3, 8, DATEADD(MINUTE,  7*60+30, @base_p2), 'ONLINE',
    N'Tư vấn phẫu thuật Lasik',    NULL, NULL, NULL,
    NULL, NULL, NULL, 'PENDING', GETDATE()),

-- Đã hủy - ngày mai (bệnh nhân hủy)
(8, 3, 1, 1, DATEADD(MINUTE, 10*60+0,  @base_p1), 'WALK_IN',
    NULL,                           NULL, NULL, NULL,
    N'Bệnh nhân bận việc đột xuất', 12, GETDATE(), 'CANCELLED', GETDATE());

SET IDENTITY_INSERT appointments OFF;
GO

-- ============================================================
-- 10. medical_records  (cho 4 appointments COMPLETED: id 1-4)
-- FK: appointment_id → appointments, patient_id → patients,
--     doctor_id → doctors, locked_by → users
-- ============================================================
SET IDENTITY_INSERT medical_records ON;

INSERT INTO medical_records
    (id, appointment_id, patient_id, doctor_id,
     chief_complaint, symptoms, diagnosis, treatment_plan, notes,
     va_l,  va_r,  bcva_l, bcva_r,
     sph_l, cyl_l, axis_l, iop_l,
     sph_r, cyl_r, axis_r, iop_r,
     total_amount, locked_at, locked_by, status, created_at)
VALUES
-- MR1: Cận thị tăng độ (appt 1, patient 1, doctor 1 = user 3)
(1, 1, 1, 1,
    N'Mắt mờ, nhức đầu sau khi nhìn màn hình',
    N'Thị lực giảm cả 2 mắt, không đỏ không đau',
    N'Cận thị tăng độ OU',
    N'Đổi kính, hạn chế màn hình, tái khám 6 tháng',
    N'Bệnh nhân làm việc máy tính >8h/ngày',
    0.6, 0.5, 1.0, 1.0,
    -2.50, -0.50, 180, 14.0,
    -3.00, -0.75, 175, 13.5,
    500000, DATEADD(DAY,-3,GETDATE()), 3, 'COMPLETED', DATEADD(DAY,-3,GETDATE())),

-- MR2: Viêm kết mạc (appt 2, patient 2, doctor 1 = user 3)
(2, 2, 2, 1,
    N'Mắt đỏ, chảy ghèn 3 ngày',
    N'Kết mạc cương tụ, tiết tố nhầy mủ 2 mắt',
    N'Viêm kết mạc cấp do vi khuẩn',
    N'Nhỏ kháng sinh + chống viêm 7 ngày, rửa mắt bằng nước muối sinh lý',
    NULL,
    0.9, 0.8, 1.0, 1.0,
    NULL, NULL, NULL, 15.0,
    NULL, NULL, NULL, 14.5,
    278000, DATEADD(DAY,-3,GETDATE()), 3, 'COMPLETED', DATEADD(DAY,-3,GETDATE())),

-- MR3: Cận thị + loạn (appt 3, patient 3, doctor 2 = user 4)
(3, 3, 3, 2,
    N'Mờ mắt khi nhìn xa, khó lái xe ban đêm',
    N'Thị lực giảm, quầng sáng quanh đèn về đêm',
    N'Cận thị OU, loạn thị nhẹ',
    N'Cấp đơn kính, tư vấn kính áp tròng toric nếu muốn',
    NULL,
    0.5, 0.4, 1.0, 1.0,
    -2.75, -0.50, 170, 13.0,
    -3.25, -0.50, 165, 12.5,
    80000, DATEADD(DAY,-3,GETDATE()), 4, 'COMPLETED', DATEADD(DAY,-3,GETDATE())),

-- MR4: Đục TTT (appt 4, patient 4, doctor 3 = user 5)
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

-- ============================================================
-- 11. prescriptions
-- issued_by → users (bác sĩ user_id 3, 4)
-- dispensed_by → users (dược sĩ user_id 8)
-- ============================================================
SET IDENTITY_INSERT prescriptions ON;

INSERT INTO prescriptions
    (id, medical_record_id, type, notes,
     issued_by, dispensed_by, dispensed_at, status, created_at)
VALUES
-- Đơn kính cho MR1 (đã cấp)
(1, 1, 'GLASSES',
    N'Kính cận đơn tròng. Tư vấn kính 2 tròng nếu > 40 tuổi.',
    3, 8, DATEADD(DAY,-3,GETDATE()), 'DISPENSED', DATEADD(DAY,-3,GETDATE())),

-- Đơn thuốc cho MR2 (đã cấp)
(2, 2, 'MEDICINE',
    N'Nhỏ kháng sinh sáng-tối, nhỏ chống viêm trưa-chiều trong 7 ngày.',
    3, 8, DATEADD(DAY,-3,GETDATE()), 'DISPENSED', DATEADD(DAY,-3,GETDATE())),

-- Đơn kính cho MR3 (chờ cấp)
(3, 3, 'GLASSES',
    N'Cận thị OU, cấp đơn kính gọng. Tư vấn thêm kính áp tròng toric.',
    4, NULL, NULL, 'PENDING', DATEADD(DAY,-3,GETDATE()));

SET IDENTITY_INSERT prescriptions OFF;
GO

-- ============================================================
-- 12. prescription_items  (cho prescription thuốc id=2)
-- medicine_id → medicines (1=Tobramycin, 2=Dexamethasone)
-- ============================================================
SET IDENTITY_INSERT prescription_items ON;

INSERT INTO prescription_items
    (id, prescription_id, medicine_id, quantity, unit,
     dosage_instruction, unit_price, status, created_at)
VALUES
(1, 2, 1, 2, N'Lọ',
    N'Nhỏ 1 giọt/mắt, sáng và tối sau rửa mặt, dùng trong 7 ngày.',
    45000, 'DISPENSED', DATEADD(DAY,-3,GETDATE())),

(2, 2, 2, 1, N'Lọ',
    N'Nhỏ 1 giọt/mắt, trưa và chiều tối, dùng trong 5 ngày.',
    38000, 'DISPENSED', DATEADD(DAY,-3,GETDATE()));

SET IDENTITY_INSERT prescription_items OFF;
GO

-- ============================================================
-- 13. glasses_orders  (cho prescription GLASSES đã DISPENSED: id=1)
-- dispensed_by → users (dược sĩ user_id=8)
-- ============================================================
SET IDENTITY_INSERT glasses_orders ON;

INSERT INTO glasses_orders
    (id, prescription_id,
     frame_description,
     sph_r, cyl_r, axis_r, sph_l, cyl_l, axis_l,
     add_power, pd_right, pd_left,
     lens_type, lens_coating,
     dispensed_by, dispensed_at, status, created_at)
VALUES
(1, 1,
    N'Gọng titan mỏng, màu đen, size M',
    -3.00, -0.75, 175,
    -2.50, -0.50, 180,
    NULL, 32.0, 31.5,
    N'Polycarbonate 1.60',
    N'Chống tia UV + chống phản chiếu (AR)',
    8, DATEADD(DAY,-2,GETDATE()), 'DISPENSED', DATEADD(DAY,-3,GETDATE()));

SET IDENTITY_INSERT glasses_orders OFF;
GO

-- ============================================================
-- 14. lab_orders
-- medical_record_id → medical_records (1, 2, 4)
-- ordered_by → users (bác sĩ: user_id 3, 5)
-- assigned_to → users (lab tech: user_id 9)
-- ============================================================
SET IDENTITY_INSERT lab_orders ON;

INSERT INTO lab_orders
    (id, medical_record_id, ordered_by, assigned_to, notes,
     priority, completed_at, status, created_at)
VALUES
-- Xét nghiệm tiền phẫu cho MR4 (URGENT - đã xong)
(1, 4, 5, 9,
    N'Xét nghiệm tiền phẫu: sinh hóa máu. Ưu tiên trả kết quả trong ngày.',
    'URGENT', DATEADD(DAY,-2,GETDATE()), 'COMPLETED', DATEADD(DAY,-2,GETDATE())),

-- Chụp OCT cho MR1 (NORMAL - đã xong)
(2, 1, 3, 9,
    N'Chụp OCT hoàng điểm để loại trừ thoái hóa hoàng điểm.',
    'NORMAL', DATEADD(DAY,-3,GETDATE()), 'COMPLETED', DATEADD(DAY,-3,GETDATE())),

-- Soi đáy mắt cho MR2 (NORMAL - đang chờ)
(3, 2, 3, 9,
    N'Soi đáy mắt loại trừ viêm màng bồ đào.',
    'NORMAL', NULL, 'PENDING', DATEADD(DAY,-3,GETDATE()));

SET IDENTITY_INSERT lab_orders OFF;
GO

-- ============================================================
-- 15. lab_results  (cho lab_orders đã COMPLETED: id 1, 2)
-- uploaded_by → users (lab tech: user_id 9)
-- reviewed_by → users (bác sĩ: user_id 5, 3)
-- ============================================================
SET IDENTITY_INSERT lab_results ON;

INSERT INTO lab_results
    (id, lab_order_id, result_data, doctor_notes,
     uploaded_by, reviewed_by, reviewed_at, status, created_at)
VALUES
(1, 1,
    N'{"glucose":"5.2 mmol/L","cholesterol":"4.8 mmol/L","HbA1c":"5.4%","PT":"13s","APTT":"32s","WBC":"7.2","RBC":"4.8","Hb":"140"}',
    N'Chỉ số tiền phẫu trong giới hạn bình thường. An toàn để phẫu thuật.',
    9, 5, DATEADD(DAY,-2,GETDATE()), 'REVIEWED', DATEADD(DAY,-2,GETDATE())),

(2, 2,
    N'{"OCT":"Hoàng điểm bình thường, độ dày võng mạc trung tâm 260μm, không phù hoàng điểm, IS/OS nguyên vẹn"}',
    N'Hình ảnh OCT bình thường. Không cần can thiệp thêm.',
    9, 3, DATEADD(DAY,-3,GETDATE()), 'REVIEWED', DATEADD(DAY,-3,GETDATE()));

SET IDENTITY_INSERT lab_results OFF;
GO

-- ============================================================
-- 16. lab_order_items
-- lab_order_id → lab_orders (1, 2, 3)
-- service_id   → services (7=XN sinh hóa, 4=OCT, 3=Soi đáy mắt)
-- result_id    → lab_results (1, 2, NULL)
-- ============================================================
SET IDENTITY_INSERT lab_order_items ON;

INSERT INTO lab_order_items
    (id, lab_order_id, service_id, status, result_id, created_at)
VALUES
(1, 1, 7, 'COMPLETED', 1, DATEADD(DAY,-2,GETDATE())),  -- XN sinh hóa → result 1
(2, 2, 4, 'COMPLETED', 2, DATEADD(DAY,-3,GETDATE())),  -- OCT → result 2
(3, 3, 3, 'PENDING',   NULL, DATEADD(DAY,-3,GETDATE())); -- Soi đáy mắt → chờ

SET IDENTITY_INSERT lab_order_items OFF;
GO

-- ============================================================
-- 17. service_assignments  (gắn service bổ sung vào lab_result)
-- lab_result_id → lab_results
-- service_id    → services
-- ============================================================
SET IDENTITY_INSERT service_assignments ON;

INSERT INTO service_assignments
    (id, lab_result_id, service_id, status, created_at)
VALUES
(1, 1, 6, 'ACTIVE', DATEADD(DAY,-2,GETDATE())),  -- Kết quả XN 1 → thêm chụp Topo
(2, 2, 5, 'ACTIVE', DATEADD(DAY,-3,GETDATE()));   -- Kết quả OCT 2 → thêm đo nhãn áp

SET IDENTITY_INSERT service_assignments OFF;
GO

-- ============================================================
-- 18. invoices  (cho 4 appointments COMPLETED)
-- appointment_id → appointments (1-4)
-- patient_id     → patients (1-4)
-- issued_by      → users (lễ tân: 6, 7)
-- ============================================================
SET IDENTITY_INSERT invoices ON;

INSERT INTO invoices
    (id, appointment_id, patient_id,
     sub_total, discount_amount, tax, total_amount,
     payment_method, payment_status,
     issued_by, paid_at, generated_at, status, created_at)
VALUES
-- Invoice 1: khám tổng quát + OCT = 500,000
(1, 1, 1, 500000, 0, 0, 500000,
    'CASH',    'PAID', 6, DATEADD(DAY,-3,GETDATE()), DATEADD(DAY,-3,GETDATE()), 'ISSUED', DATEADD(DAY,-3,GETDATE())),

-- Invoice 2: khám + thuốc (2 Tobramycin + 1 Dexamethasone) = 278,000
(2, 2, 2, 278000, 0, 0, 278000,
    'VIET_QR', 'PAID', 6, DATEADD(DAY,-3,GETDATE()), DATEADD(DAY,-3,GETDATE()), 'ISSUED', DATEADD(DAY,-3,GETDATE())),

-- Invoice 3: đo khúc xạ = 80,000
(3, 3, 3, 80000,  0, 0, 80000,
    'CASH',    'PAID', 7, DATEADD(DAY,-3,GETDATE()), DATEADD(DAY,-3,GETDATE()), 'ISSUED', DATEADD(DAY,-3,GETDATE())),

-- Invoice 4: phẫu thuật + XN tiền phẫu = 15,180,000
(4, 4, 4, 15180000, 0, 0, 15180000,
    'VIET_QR', 'PAID', 6, DATEADD(DAY,-2,GETDATE()), DATEADD(DAY,-2,GETDATE()), 'ISSUED', DATEADD(DAY,-2,GETDATE()));

SET IDENTITY_INSERT invoices OFF;
GO

-- ============================================================
-- 19. invoice_details
-- invoice_id → invoices
-- ============================================================
SET IDENTITY_INSERT invoice_details ON;

INSERT INTO invoice_details
    (id, invoice_id, item_type, description, unit_price, quantity, sub_total, ref_id, status, created_at)
VALUES
-- Invoice 1: khám (150,000) + OCT (350,000) = 500,000
(1, 1, 'SERVICE',  N'Khám mắt tổng quát',   150000, 1, 150000, 1, 'ACTIVE', DATEADD(DAY,-3,GETDATE())),
(2, 1, 'SERVICE',  N'Chụp OCT võng mạc',    350000, 1, 350000, 4, 'ACTIVE', DATEADD(DAY,-3,GETDATE())),

-- Invoice 2: khám (150,000) + Tobramycin x2 (90,000) + Dexamethasone x1 (38,000) = 278,000
(3, 2, 'SERVICE',  N'Khám mắt tổng quát',   150000, 1, 150000, 1, 'ACTIVE', DATEADD(DAY,-3,GETDATE())),
(4, 2, 'MEDICINE', N'Tobramycin 0.3% x 2 lọ', 45000, 2,  90000, 1, 'ACTIVE', DATEADD(DAY,-3,GETDATE())),
(5, 2, 'MEDICINE', N'Dexamethasone 0.1% x 1 lọ', 38000, 1, 38000, 2, 'ACTIVE', DATEADD(DAY,-3,GETDATE())),

-- Invoice 3: đo khúc xạ (80,000)
(6, 3, 'SERVICE',  N'Đo khúc xạ máy',        80000, 1,  80000, 2, 'ACTIVE', DATEADD(DAY,-3,GETDATE())),

-- Invoice 4: phẫu thuật (15,000,000) + XN tiền phẫu (180,000) = 15,180,000
(7, 4, 'SERVICE',  N'Phẫu thuật đục thủy tinh thể', 15000000, 1, 15000000, 8, 'ACTIVE', DATEADD(DAY,-2,GETDATE())),
(8, 4, 'SERVICE',  N'Xét nghiệm sinh hóa máu cơ bản', 180000, 1,  180000, 7, 'ACTIVE', DATEADD(DAY,-2,GETDATE()));

SET IDENTITY_INSERT invoice_details OFF;
GO

-- ============================================================
-- 20. notifications  (user_id → users)
-- ============================================================
SET IDENTITY_INSERT notifications ON;

INSERT INTO notifications
    (id, user_id, channel, subject, body,
     ref_type, ref_id, sent_status, sent_at, is_read, read_at, created_at)
VALUES
(1, 10, 'EMAIL',  N'Xác nhận lịch hẹn #6',
    N'Lịch hẹn ngày mai lúc 09:00 với BS. Trần Thị Bình đã được xác nhận. Vui lòng đến đúng giờ.',
    N'appointment', 6, 'SENT', GETDATE(), 1, GETDATE(), GETDATE()),

(2, 11, 'IN_APP', NULL,
    N'Lịch hẹn #7 của bạn đang chờ xác nhận từ phòng khám.',
    N'appointment', 7, 'SENT', GETDATE(), 0, NULL, GETDATE()),

(3, 10, 'IN_APP', NULL,
    N'Hóa đơn #1 đã được thanh toán thành công (500,000 đ). Cảm ơn bạn!',
    N'invoice', 1, 'SENT', GETDATE(), 1, GETDATE(), GETDATE()),

(4, 14, 'SMS',    N'Nhắc lịch hẹn',
    N'[ECMS] Nhắc nhở: Bạn có lịch hẹn vào hôm qua lúc 13:00. Vui lòng liên hệ nếu cần đặt lại.',
    N'appointment', 5, 'SENT', GETDATE(), 0, NULL, GETDATE()),

(5, 13, 'EMAIL',  N'Kết quả phẫu thuật đục thủy tinh thể',
    N'Hồ sơ bệnh án sau phẫu thuật của bạn đã được cập nhật. Vui lòng tái khám sau 1 tuần.',
    N'medical_record', 4, 'SENT', GETDATE(), 0, NULL, GETDATE());

SET IDENTITY_INSERT notifications OFF;
GO

-- ============================================================
-- 21. feedbacks
-- patient_id     → patients (1, 2, 4)
-- appointment_id → appointments (1, 2, 4)
-- doctor_id      → doctors (1, 1, 3)
-- ============================================================
SET IDENTITY_INSERT feedbacks ON;

INSERT INTO feedbacks
    (id, patient_id, appointment_id, doctor_id,
     rating, content, is_anonymous, status, created_at)
VALUES
(1, 1, 1, 1, 5,
    N'Bác sĩ rất tận tâm, giải thích rõ ràng. Phòng khám sạch sẽ, nhân viên thân thiện. Rất hài lòng!',
    0, 'APPROVED', DATEADD(DAY,-2,GETDATE())),

(2, 2, 2, 1, 4,
    N'Bác sĩ khám kỹ, dặn dò chi tiết. Chờ hơi lâu nhưng chấp nhận được.',
    0, 'APPROVED', DATEADD(DAY,-2,GETDATE())),

(3, 4, 4, 3, 5,
    N'Ca phẫu thuật diễn ra thuận lợi, ê-kíp rất chuyên nghiệp. Phục hồi thị lực tốt sau 1 ngày.',
    1, 'PENDING', DATEADD(DAY,-1,GETDATE()));

SET IDENTITY_INSERT feedbacks OFF;
GO

-- ============================================================
-- 22. blog_posts  (author_id → users: bác sĩ 3, 4, 5)
-- ============================================================
SET IDENTITY_INSERT blog_posts ON;

INSERT INTO blog_posts
    (id, title, slug, content, author_id, status, published_at, created_at)
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

-- ============================================================
-- 23. refresh_tokens  (user_id → users)
-- ============================================================
SET IDENTITY_INSERT refresh_tokens ON;

INSERT INTO refresh_tokens
    (id, user_id, token_hash, device_info, expires_at, created_at)
VALUES
(1, 1,
    N'a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2',
    N'Chrome 124 / Windows 11', DATEADD(DAY,7,GETDATE()), GETDATE()),
(2, 3,
    N'b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3',
    N'Firefox 125 / macOS',     DATEADD(DAY,7,GETDATE()), GETDATE()),
(3, 10,
    N'c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4',
    N'Chrome 124 / Android 14', DATEADD(DAY,7,GETDATE()), GETDATE());

SET IDENTITY_INSERT refresh_tokens OFF;
GO

-- ============================================================
-- 24. password_reset_tokens  (user_id → users)
-- Mô phỏng 1 token đã dùng, 1 token còn hiệu lực
-- ============================================================
SET IDENTITY_INSERT password_reset_tokens ON;

INSERT INTO password_reset_tokens
    (id, user_id, token_hash, type, expires_at, used_at, created_at)
VALUES
(1, 11,
    N'd4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5',
    'PASSWORD_RESET', DATEADD(HOUR,1,DATEADD(DAY,-2,GETDATE())),
    DATEADD(MINUTE,15,DATEADD(DAY,-2,GETDATE())), DATEADD(DAY,-2,GETDATE())),

(2, 12,
    N'e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6',
    'EMAIL_VERIFY', DATEADD(HOUR,24,GETDATE()),
    NULL, GETDATE());

SET IDENTITY_INSERT password_reset_tokens OFF;
GO

-- ============================================================
-- 25. audit_logs  (user_id → users, nullable)
-- ============================================================
SET IDENTITY_INSERT audit_logs ON;

INSERT INTO audit_logs
    (id, user_id, action, entity_type, entity_id,
     old_value, new_value, ip_address, created_at)
VALUES
(1, 1,  N'CREATE', N'users',          14,
    NULL,
    N'{"email":"patient5@gmail.com","role":"PATIENT","status":"ACTIVE"}',
    N'192.168.1.1',  DATEADD(DAY,-7,GETDATE())),

(2, 6,  N'UPDATE', N'appointments',    8,
    N'{"status":"PENDING"}',
    N'{"status":"CANCELLED","cancel_reason":"Bệnh nhân bận việc đột xuất"}',
    N'192.168.1.10', GETDATE()),

(3, 3,  N'UPDATE', N'medical_records', 1,
    N'{"status":"IN_PROGRESS"}',
    N'{"status":"COMPLETED","locked_at":"...","locked_by":3}',
    N'192.168.1.20', DATEADD(DAY,-3,GETDATE())),

(4, 8,  N'UPDATE', N'prescriptions',   2,
    N'{"status":"PENDING"}',
    N'{"status":"DISPENSED","dispensed_by":8,"dispensed_at":"..."}',
    N'192.168.1.30', DATEADD(DAY,-3,GETDATE())),

(5, 1,  N'UPDATE', N'system_configs',  1,
    N'{"config_value":"30"}',
    N'{"config_value":"30"}',
    N'192.168.1.1',  DATEADD(DAY,-1,GETDATE()));

SET IDENTITY_INSERT audit_logs OFF;
GO

-- ============================================================
-- 26. backup_logs  (created_by → users: admin user_id=1)
-- ============================================================
SET IDENTITY_INSERT backup_logs ON;

INSERT INTO backup_logs
    (id, backup_name, file_path, type, status, size_bytes, created_by, created_at)
VALUES
(1, N'ecms_backup_scheduled_20260528',
    N'D:\Backups\ecms_backup_scheduled_20260528.bak',
    'SCHEDULED', 'SUCCESS', 524288000, 1, DATEADD(DAY,-3,GETDATE())),

(2, N'ecms_backup_manual_20260531',
    N'D:\Backups\ecms_backup_manual_20260531.bak',
    'MANUAL',    'SUCCESS', 531000000, 1, GETDATE());

SET IDENTITY_INSERT backup_logs OFF;
GO

PRINT N'';
PRINT N'✅ ECMS Seed Data hoàn tất!';
PRINT N'';
PRINT N'  users              : 15 (1 admin, 1 manager, 3 doctor, 2 receptionist, 1 pharmacist, 1 labtech, 1 nurse, 5 patient)';
PRINT N'  doctors            : 3';
PRINT N'  staffs             : 4';
PRINT N'  patients           : 5';
PRINT N'  services           : 14 (5 CARE, 9 CLINICAL)';
PRINT N'  doctor_schedules   : 11 (quá khứ FULL + tương lai AVAILABLE)';
PRINT N'  appointments       : 8 (COMPLETED/IN_PROGRESS/CONFIRMED/PENDING/CANCELLED)';
PRINT N'  medical_records    : 4';
PRINT N'  prescriptions      : 3 (GLASSES/MEDICINE, DISPENSED/PENDING)';
PRINT N'  prescription_items : 2';
PRINT N'  glasses_orders     : 1';
PRINT N'  medicines          : 6';
PRINT N'  lab_orders         : 3 (COMPLETED/PENDING)';
PRINT N'  lab_results        : 2';
PRINT N'  lab_order_items    : 3';
PRINT N'  service_assignments: 2';
PRINT N'  invoices           : 4 (tổng 15,958,000 đ, tất cả PAID)';
PRINT N'  invoice_details    : 8';
PRINT N'  notifications      : 5 (EMAIL/IN_APP/SMS)';
PRINT N'  feedbacks          : 3 (rating 4-5 sao)';
PRINT N'  blog_posts         : 3 (2 PUBLISHED, 1 DRAFT)';
PRINT N'  refresh_tokens     : 3';
PRINT N'  password_reset_tokens: 2';
PRINT N'  audit_logs         : 5';
PRINT N'  backup_logs        : 2';
PRINT N'';
PRINT N'  Mật khẩu tất cả tài khoản: Password@123';
GO