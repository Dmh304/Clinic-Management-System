-- ============================================================================
-- ECMS — Eyes Clinic Management System
-- FILE 2/2: DATA SEED (dữ liệu demo + tài khoản đăng nhập)
--
-- CHẠY SAU ecms_schema.sql (roles/system_configs/notification_templates đã có).
-- CÁCH CHẠY (chọn 1 trong 2):
--   1. SSMS  : mở file này → Execute (F5)
--   2. sqlcmd: sqlcmd -S localhost,1433 -U sa -P <password> -C -f 65001 -i ecms_data_seed.sql
--              (bắt buộc có -f 65001 để đọc đúng tiếng Việt UTF-8)
--
-- Dự án chỉ còn ĐÚNG 2 file SQL: ecms_schema.sql (bảng) + file này (dữ liệu).
-- Đã gộp và xoá 2 file rời trước đây:
--   • ecms_blog_categories_patch.sql — nội dung (4 blog_categories + bài viết 4-7)
--     đã nằm sẵn ở mục 21-22 bên dưới nên file patch không còn cần thiết.
--   • ecms_test_data_extra.sql       — chuyển thành MỤC 32 (tuỳ chọn) ở cuối file.
--   • ecms_promotions_seed_patch.sql      — 10 khuyến mãi theo mùa → mục 8.
--   • "Thêm loại kính.sql"                — 5 tròng + 7 gọng phổ thông → mục 29.
--   • ecms_massage_package_price_patch.sql — sửa giá gói massage → mục 6 + 18.
--   • ecms_feedback_care_session_patch.sql / ecms_notification_entity_type_patch.sql
--     — phần ĐỔI CẤU TRÚC BẢNG đã vào ecms_schema.sql (bảng feedbacks &
--       notifications); phần dữ liệu demo vào mục 20 + 26 bên dưới.
--   • ecms_uploaded_images_sync.sql  — KHÔNG gộp: file này trỏ tới 16 ảnh nằm ở
--     branch `ngan` (commit fca1834), chưa merge vào đây → gộp vào sẽ làm ảnh 404.
--     Sau khi merge `ngan`, chạy lại regenerate_uploaded_images_sync.ps1 để sinh mới.
--
-- Đợt gộp 2 (sau khi merge test-branch) — đã xoá tiếp 8 file rời:
--   • insert_lens_types.sql / insert_eyeglass_frames.sql / insert_eyeglass_coatings.sql
--     → danh mục xưởng kính ở mục 12 + 29 nay LẤY THEO BỘ NÀY (đầy đủ, có brand
--       thật), chỉ giữ thêm vài dòng phân khúc giá rẻ từ "Thêm loại kính.sql".
--   • Update_lab_service.sql              — CK_medical_records_status đã có 'DRAFT' sẵn.
--   • add_rooms_and_staff_assignments.sql — rooms/staff_room_assignments đã có ở schema.
--   • db_schema.sql                       — bản schema cũ 33 bảng, là tập con của 44 bảng.
--   • data_seed_sum_final.sql             — bản dump seed cũ (admin@ecms.vn, id cũ).
--   • change_patient_role_id.sql          — script nháp cá nhân (reset TOÀN BỘ mật khẩu,
--                                           sửa role theo dải id cứng) — KHÔNG dùng lại.
--
-- MẬT KHẨU TẤT CẢ TÀI KHOẢN: Password@123
--
-- ┌── 36 TÀI KHOẢN, CHIA 2 LOẠI THEO CỜ users.is_virtual ────────────────────┐
-- │ is_virtual = 0 → EMAIL THẬT (16 tk của team)                             │
-- │     • Nhân viên  : đăng nhập tab "Nhân viên" → nhập mật khẩu → nhận mã   │
-- │                    OTP qua email → xác minh (2 bước).                    │
-- │     • Bệnh nhân  : đăng nhập cổng bệnh nhân như bình thường.             │
-- │ is_virtual = 1 → EMAIL ẢO/DEMO (20 tk)                                   │
-- │     • Nhân viên  : PHẢI đăng nhập tab "Demo" (1 bước, KHÔNG OTP) vì      │
-- │                    email ảo không nhận được thư — xem AuthService.demoLogin│
-- │     • Bệnh nhân  : vẫn đăng nhập cổng bệnh nhân bình thường.             │
-- └──────────────────────────────────────────────────────────────────────────┘
--
-- LƯU Ý VỀ VAI TRÒ: hệ thống chỉ có 8 role (xem bảng roles trong ecms_schema.sql).
-- "Clinic Manager" trong SRS chính là role MANAGER (mô tả: "Quản lý phòng khám"),
-- nên cả "manager" lẫn "clinic manager" đều được gán role_id = 2.
--
-- ============================ TÀI KHOẢN EMAIL THẬT ==========================
--   id  email                                 vai trò          họ tên
--   1   mh3k42k6@gmail.com                    ADMIN            Đồng Mạnh Hùng
--   2   bahungcl1999@gmail.com                MANAGER          Đồng Quản Lý
--   3   bichngan1826@gmail.com                RECEPTIONIST     Lê Thị Bích Ngân
--   4   andreale389@gmail.com                 NURSE            Lê Điều Dưỡng
--   5   nganle1389@gmail.com                  MANAGER          Lê Quản Lý
--   6   dantayf8@gmail.com                    PATIENT          Lê Bệnh Nhân
--   7   thanggamer2k24@gmail.com              MANAGER          Ngô Quản Lý
--   8   ngobachthang2k6@gmail.com             RECEPTIONIST     Ngô Bạch Thắng
--   9   trangthangtuong@gmail.com             PATIENT          Ngô Bệnh Nhân
--   10  thaikhachuuduc@gmail.com              DOCTOR           Thái Khắc Hữu Đức
--   11  thaikhachuuducf01lephuoc@gmail.com    PHARMACIST       Thái Dược Sĩ
--   12  haingapck@gmail.com                   RECEPTIONIST     Thái Quản Lý
--   13  trinhdinhtuan23@gmail.com             DOCTOR           Trịnh Đình Tuấn
--   14  tridintstudio23@gmail.com             LAB_TECHNICIAN   Trịnh Kỹ Thuật Viên
--   15  exchange123456788@gmail.com           RECEPTIONIST     Trịnh Quản Lý
--   16  konamiefootballacc123@gmail.com       MANAGER          Trịnh Quản Lý
--
-- ============================= TÀI KHOẢN EMAIL ẢO ===========================
--   17  admin@ecms.com          ADMIN          | 23  labtech@ecms.com      LAB_TECH
--   18  manager@ecms.com        MANAGER        | 24  pharmacist@ecms.com   PHARMACIST
--   19  doctor1@ecms.com        DOCTOR         | 25  nurse1@ecms.com       NURSE
--   20  doctor2@ecms.com        DOCTOR         | 26  nurse2@ecms.com       NURSE
--   21  receptionist1@ecms.com  RECEPTIONIST   | 27-36 patient1..10@gmail.com PATIENT
--   22  receptionist2@ecms.com  RECEPTIONIST   |
-- (Yêu cầu ghi "manager@emcs.com" / "labtech@emcs.com" — đã chuẩn hoá về @ecms.com
--  cho đồng bộ với 6 email ảo còn lại.)
-- ============================================================================

USE ecms_db;
GO
SET QUOTED_IDENTIFIER ON;
SET ANSI_NULLS ON;
GO

-- ============================================================================
-- 1. users — 36 tài khoản (16 email thật + 20 email ảo)
--    roles: ADMIN=1, MANAGER=2, DOCTOR=3, RECEPTIONIST=4, PHARMACIST=5,
--           LAB_TECHNICIAN=6, NURSE=7, PATIENT=8
--    is_virtual: 0 = email thật (đăng nhập OTP) | 1 = email ảo (đăng nhập tab Demo)
-- ============================================================================
SET IDENTITY_INSERT users ON;

DECLARE @pw NVARCHAR(255) = N'$2a$10$gfSU.mS4YQd7cICUyobl/en..jS9epCm4YpeYiRbllaEL2TbAOGmy'; -- Password@123

INSERT INTO users
    (id, email, password, full_name, phone_number, date_of_birth, gender,
     address, department, role_id, status, auth_provider, is_virtual, created_at)
VALUES
-- ═══════════════ EMAIL THẬT (is_virtual = 0) — 16 tài khoản ═══════════════
(1,  N'mh3k42k6@gmail.com',                 @pw, N'Đồng Mạnh Hùng',      N'0967396756', '2006-04-30', 'MALE',
     N'Ngũ Phúc, Kim Thành, Hải Dương',              N'Ban quản trị',  1, 'ACTIVE', 'LOCAL', 0, GETDATE()),

(2,  N'bahungcl1999@gmail.com',             @pw, N'Đồng Quản Lý',        N'0967396757', '1999-05-12', 'MALE',
     N'Ngũ Phúc, Kim Thành, Hải Dương',              N'Ban giám đốc',  2, 'ACTIVE', 'LOCAL', 0, GETDATE()),

(3,  N'bichngan1826@gmail.com',             @pw, N'Lê Thị Bích Ngân',    N'0901000006', '2004-06-18', 'FEMALE',
     N'6 Bạch Đằng, Q. Bình Thạnh, TP.HCM',          N'Lễ tân',        4, 'ACTIVE', 'LOCAL', 0, GETDATE()),

(4,  N'andreale389@gmail.com',              @pw, N'Lê Điều Dưỡng',       N'0901000099', '2004-04-10', 'FEMALE',
     N'15 Lê Văn Sỹ, Q3, TP.HCM',                    N'Điều dưỡng',    7, 'ACTIVE', 'LOCAL', 0, GETDATE()),

(5,  N'nganle1389@gmail.com',               @pw, N'Lê Quản Lý',          N'0901000015', '2000-03-22', 'FEMALE',
     N'18 Nguyễn Đình Chiểu, Q3, TP.HCM',            N'Ban giám đốc',  2, 'ACTIVE', 'LOCAL', 0, GETDATE()),

(6,  N'dantayf8@gmail.com',                 @pw, N'Lê Bệnh Nhân',        N'0912000011', '1998-09-05', 'MALE',
     N'26 Lý Chính Thắng, Q3, TP.HCM',               NULL,             8, 'ACTIVE', 'LOCAL', 0, GETDATE()),

(7,  N'thanggamer2k24@gmail.com',           @pw, N'Ngô Quản Lý',         N'0971254653', '2006-12-02', 'MALE',
     N'Đông Anh, Hà Nội',                            N'Ban giám đốc',  2, 'ACTIVE', 'LOCAL', 0, GETDATE()),

(8,  N'ngobachthang2k6@gmail.com',          @pw, N'Ngô Bạch Thắng',      N'0967000017', '2006-01-01', 'MALE',
     N'Kim Thành, Hải Dương',                        N'Lễ tân',        4, 'ACTIVE', 'LOCAL', 0, GETDATE()),

(9,  N'trangthangtuong@gmail.com',          @pw, N'Ngô Bệnh Nhân',       N'0920000002', '2001-11-12', 'MALE',
     N'88 Nguyễn Trãi, Q5, TP.HCM',                  NULL,             8, 'ACTIVE', 'LOCAL', 0, GETDATE()),

(10, N'thaikhachuuduc@gmail.com',           @pw, N'Thái Khắc Hữu Đức',   N'0903000010', '1988-02-17', 'MALE',
     N'12 Trần Hưng Đạo, Q1, TP.HCM',                N'Phòng khám tổng quát', 3, 'ACTIVE', 'LOCAL', 0, GETDATE()),

(11, N'thaikhachuuducf01lephuoc@gmail.com', @pw, N'Thái Dược Sĩ',        N'0903000011', '1992-07-08', 'MALE',
     N'34 Nguyễn Thiện Thuật, Q3, TP.HCM',           N'Nhà thuốc',     5, 'ACTIVE', 'LOCAL', 0, GETDATE()),

(12, N'haingapck@gmail.com',                @pw, N'Thái Quản Lý',        N'0903000012', '1996-10-30', 'FEMALE',
     N'9 Cao Thắng, Q3, TP.HCM',                     N'Lễ tân',        4, 'ACTIVE', 'LOCAL', 0, GETDATE()),

(13, N'trinhdinhtuan23@gmail.com',          @pw, N'Trịnh Đình Tuấn',     N'0904000013', '1985-11-23', 'MALE',
     N'45 Điện Biên Phủ, Q. Bình Thạnh, TP.HCM',     N'Phòng khúc xạ', 3, 'ACTIVE', 'LOCAL', 0, GETDATE()),

(14, N'tridintstudio23@gmail.com',          @pw, N'Trịnh Kỹ Thuật Viên', N'0904000014', '1994-04-02', 'MALE',
     N'23 Nguyễn Thị Minh Khai, Q1, TP.HCM',         N'Xét nghiệm',    6, 'ACTIVE', 'LOCAL', 0, GETDATE()),

(15, N'exchange123456788@gmail.com',        @pw, N'Trịnh Quản Lý',       N'0904000015', '1999-08-14', 'FEMALE',
     N'7 Lê Duẩn, Q1, TP.HCM',                       N'Lễ tân',        4, 'ACTIVE', 'LOCAL', 0, GETDATE()),

(16, N'konamiefootballacc123@gmail.com',    @pw, N'Trịnh Quản Lý',       N'0904000016', '1997-12-25', 'MALE',
     N'15 Pasteur, Q1, TP.HCM',                      N'Ban giám đốc',  2, 'ACTIVE', 'LOCAL', 0, GETDATE()),

-- ═══════════ EMAIL ẢO — NHÂN VIÊN (is_virtual = 1, đăng nhập tab Demo) ═══════════
(17, N'admin@ecms.com',        @pw, N'Quản Trị Viên Hệ Thống', N'0900000017', '1990-01-01', 'MALE',
     N'1 Nguyễn Huệ, Q1, TP.HCM',                    N'Ban quản trị',  1, 'ACTIVE', 'LOCAL', 1, GETDATE()),

(18, N'manager@ecms.com',      @pw, N'Trần Thị Quản Lý',       N'0900000018', '1988-07-20', 'FEMALE',
     N'2 Nguyễn Huệ, Q1, TP.HCM',                    N'Ban giám đốc',  2, 'ACTIVE', 'LOCAL', 1, GETDATE()),

(19, N'doctor1@ecms.com',      @pw, N'BS. Lê Minh Châu',       N'0900000019', '1979-11-08', 'MALE',
     N'5 Võ Văn Tần, Q3, TP.HCM',                    N'Phòng phẫu thuật', 3, 'ACTIVE', 'LOCAL', 1, GETDATE()),

(20, N'doctor2@ecms.com',      @pw, N'BS. Nguyễn Văn An',      N'0900000020', '1980-01-10', 'MALE',
     N'3 Pasteur, Q3, TP.HCM',                       N'Phòng khám tổng quát', 3, 'ACTIVE', 'LOCAL', 1, GETDATE()),

(21, N'receptionist1@ecms.com', @pw, N'Hoàng Lễ Tân',          N'0900000021', '1997-09-30', 'MALE',
     N'7 Cộng Hòa, Q. Tân Bình, TP.HCM',             N'Lễ tân',        4, 'ACTIVE', 'LOCAL', 1, GETDATE()),

(22, N'receptionist2@ecms.com', @pw, N'Phạm Thu Trang',        N'0900000022', '1999-03-19', 'FEMALE',
     N'12 Hoàng Văn Thụ, Q. Phú Nhuận, TP.HCM',      N'Lễ tân',        4, 'ACTIVE', 'LOCAL', 1, GETDATE()),

(23, N'labtech@ecms.com',      @pw, N'Đặng Kỹ Thuật Viên',     N'0900000023', '1993-02-22', 'MALE',
     N'9 Nguyễn Thị Minh Khai, Q3, TP.HCM',          N'Xét nghiệm',    6, 'ACTIVE', 'LOCAL', 1, GETDATE()),

(24, N'pharmacist@ecms.com',   @pw, N'Vũ Dược Sĩ',             N'0900000024', '1990-06-18', 'FEMALE',
     N'8 Tô Hiến Thành, Q10, TP.HCM',                N'Nhà thuốc',     5, 'ACTIVE', 'LOCAL', 1, GETDATE()),

(25, N'nurse1@ecms.com',       @pw, N'Đặng Thị Thanh Thảo',    N'0900000025', '1997-02-14', 'FEMALE',
     N'22 Cách Mạng Tháng 8, Q3, TP.HCM',            N'Điều dưỡng',    7, 'ACTIVE', 'LOCAL', 1, GETDATE()),

(26, N'nurse2@ecms.com',       @pw, N'Lý Thị Kim Ngân',        N'0900000026', '1995-06-09', 'FEMALE',
     N'40 Nam Kỳ Khởi Nghĩa, Q1, TP.HCM',            N'Điều dưỡng',    7, 'ACTIVE', 'LOCAL', 1, GETDATE()),

-- ═══════════ EMAIL ẢO — BỆNH NHÂN (is_virtual = 1, cổng bệnh nhân) ═══════════
(27, N'patient1@gmail.com',  @pw, N'Bùi Văn Bình',      N'0912000001', '1990-03-10', 'MALE',
     N'10 Lý Thường Kiệt, Q10, TP.HCM',   NULL, 8, 'ACTIVE', 'LOCAL', 1, GETDATE()),
(28, N'patient2@gmail.com',  @pw, N'Đinh Thị Hoa',      N'0912000002', '1995-08-15', 'FEMALE',
     N'11 Trần Hưng Đạo, Q5, TP.HCM',     NULL, 8, 'ACTIVE', 'LOCAL', 1, GETDATE()),
(29, N'patient3@gmail.com',  @pw, N'Lý Văn Minh',       N'0912000003', '1982-12-05', 'MALE',
     N'12 An Dương Vương, Q5, TP.HCM',    NULL, 8, 'ACTIVE', 'LOCAL', 1, GETDATE()),
(30, N'patient4@gmail.com',  @pw, N'Ngô Thị Lan',       N'0912000004', '2000-05-20', 'FEMALE',
     N'13 Nguyễn Văn Cừ, Q5, TP.HCM',     NULL, 8, 'ACTIVE', 'LOCAL', 1, GETDATE()),
(31, N'patient5@gmail.com',  @pw, N'Tô Văn Dũng',       N'0912000005', '1975-07-07', 'MALE',
     N'14 Hùng Vương, Q6, TP.HCM',        NULL, 8, 'ACTIVE', 'LOCAL', 1, GETDATE()),
(32, N'patient6@gmail.com',  @pw, N'Vũ Thị Hồng',       N'0912000006', '1993-02-11', 'FEMALE',
     N'21 Lê Lợi, Q1, TP.HCM',            NULL, 8, 'ACTIVE', 'LOCAL', 1, GETDATE()),
(33, N'patient7@gmail.com',  @pw, N'Phan Văn Kiên',     N'0912000007', '1987-06-23', 'MALE',
     N'33 Trường Chinh, Q. Tân Bình, TP.HCM', NULL, 8, 'ACTIVE', 'LOCAL', 1, GETDATE()),
(34, N'patient8@gmail.com',  @pw, N'Đỗ Thị Ngọc Ánh',   N'0912000008', '2002-01-19', 'FEMALE',
     N'45 Quang Trung, Q. Gò Vấp, TP.HCM', NULL, 8, 'ACTIVE', 'LOCAL', 1, GETDATE()),
(35, N'patient9@gmail.com',  @pw, N'Hồ Văn Sang',       N'0912000009', '1968-10-04', 'MALE',
     N'5 Trần Não, TP. Thủ Đức, TP.HCM',  NULL, 8, 'ACTIVE', 'LOCAL', 1, GETDATE()),
(36, N'patient10@gmail.com', @pw, N'Mai Thị Thu Hà',    N'0912000010', '2011-04-27', 'FEMALE',
     N'17 Phan Xích Long, Q. Phú Nhuận, TP.HCM', NULL, 8, 'ACTIVE', 'LOCAL', 1, GETDATE());

SET IDENTITY_INSERT users OFF;
GO

-- ============================================================================
-- 2. doctors — 4 bác sĩ (2 email thật + 2 email ảo)
--    Mã code theo đúng quy ước backend sinh ra: DR + user_id 6 chữ số
--    (AdminUserServiceImpl.createProfileForRole)
-- ============================================================================
SET IDENTITY_INSERT doctors ON;

INSERT INTO doctors
    (id, user_id, doctor_code, full_name, license_number, specialty, academic_title, department,
     phone_number, email, experience_years, bio, achievements, status, featured, created_at)
VALUES
(1, 10, N'DR000010', N'Thái Khắc Hữu Đức', N'BV-HCM-001234', N'Khoa mắt tổng quát', N'ThS. BS.',
    N'Phòng khám tổng quát', N'0903000010', N'thaikhachuuduc@gmail.com', 12,
    N'Chuyên gia khám và điều trị các bệnh lý mắt thông thường: viêm kết mạc, khô mắt, viêm bờ mi.',
    N'Hơn 12 năm khám và điều trị tại các bệnh viện mắt lớn tại TP.HCM.', 'ACTIVE', 1, GETDATE()),

(2, 13, N'DR000013', N'Trịnh Đình Tuấn',   N'BV-HCM-005678', N'Khúc xạ & Kính áp tròng', N'BS. CKI',
    N'Phòng khúc xạ', N'0904000013', N'trinhdinhtuan23@gmail.com', 9,
    N'Chuyên điều trị tật khúc xạ, đo và tư vấn kính áp tròng, kiểm soát cận thị tiến triển.',
    N'Chứng chỉ chuyên sâu về kiểm soát cận thị ở trẻ em.', 'ACTIVE', 1, GETDATE()),

(3, 19, N'DR000019', N'BS. Lê Minh Châu',  N'BV-HCM-009012', N'Phẫu thuật mắt', N'TS. BS.',
    N'Phòng phẫu thuật', N'0900000019', N'doctor1@ecms.com', 15,
    N'Bác sĩ phẫu thuật đục thủy tinh thể (Phaco) và phẫu thuật khúc xạ Lasik.',
    N'Trên 3.000 ca phẫu thuật Phaco thành công.', 'ACTIVE', 0, GETDATE()),

(4, 20, N'DR000020', N'BS. Nguyễn Văn An', N'BV-HCM-003456', N'Khoa mắt tổng quát', N'BS.',
    N'Phòng khám tổng quát', N'0900000020', N'doctor2@ecms.com', 7,
    N'Khám tổng quát, tầm soát glocom và bệnh võng mạc đái tháo đường.',
    NULL, 'ACTIVE', 0, GETDATE());

SET IDENTITY_INSERT doctors OFF;
GO

-- ============================================================================
-- 3. lab_technicians — 2 KTV (1 email thật + 1 email ảo)
-- ============================================================================
SET IDENTITY_INSERT lab_technicians ON;

INSERT INTO lab_technicians
    (id, user_id, lab_tech_code, full_name, license_number, specialization,
     phone_number, email, status, created_at)
VALUES
(1, 14, N'LAB000014', N'Trịnh Kỹ Thuật Viên', N'LT-LIC-200014', N'Xét nghiệm mắt chuyên sâu, chụp OCT',
    N'0904000014', N'tridintstudio23@gmail.com', 'ACTIVE', GETDATE()),

(2, 23, N'LAB000023', N'Đặng Kỹ Thuật Viên',  N'LT-LIC-200023', N'Xét nghiệm sinh hóa, soi đáy mắt',
    N'0900000023', N'labtech@ecms.com',        'ACTIVE', GETDATE());

SET IDENTITY_INSERT lab_technicians OFF;
GO

-- ============================================================================
-- 4. staffs — hồ sơ nhân sự chung cho các vai trò KHÔNG có bảng chuyên môn riêng
--    (admin, quản lý, lễ tân, dược sĩ, điều dưỡng). Mã: EMP + user_id 6 chữ số.
-- ============================================================================
SET IDENTITY_INSERT staffs ON;

INSERT INTO staffs
    (id, user_id, employee_code, full_name, department, position, phone_number, hire_date, status, created_at)
VALUES
-- ── email thật ──
(1,  1,  N'EMP000001', N'Đồng Mạnh Hùng',      N'Ban quản trị', N'Quản trị viên', N'0967396756', '2023-01-02', 'ACTIVE', GETDATE()),
(2,  2,  N'EMP000002', N'Đồng Quản Lý',        N'Ban giám đốc', N'Quản lý',       N'0967396757', '2023-02-01', 'ACTIVE', GETDATE()),
(3,  3,  N'EMP000003', N'Lê Thị Bích Ngân',    N'Lễ tân',       N'Lễ tân viên',   N'0901000006', '2024-01-15', 'ACTIVE', GETDATE()),
(4,  4,  N'EMP000004', N'Lê Điều Dưỡng',       N'Điều dưỡng',   N'Điều dưỡng',    N'0901000099', '2024-09-20', 'ACTIVE', GETDATE()),
(5,  5,  N'EMP000005', N'Lê Quản Lý',          N'Ban giám đốc', N'Quản lý',       N'0901000015', '2023-06-01', 'ACTIVE', GETDATE()),
(6,  7,  N'EMP000007', N'Ngô Quản Lý',         N'Ban giám đốc', N'Quản lý',       N'0971254653', '2025-07-01', 'ACTIVE', GETDATE()),
(7,  8,  N'EMP000008', N'Ngô Bạch Thắng',      N'Lễ tân',       N'Lễ tân viên',   N'0967000017', '2025-01-06', 'ACTIVE', GETDATE()),
(8,  11, N'EMP000011', N'Thái Dược Sĩ',        N'Nhà thuốc',    N'Dược sĩ',       N'0903000011', '2022-03-14', 'ACTIVE', GETDATE()),
(9,  12, N'EMP000012', N'Thái Quản Lý',        N'Lễ tân',       N'Lễ tân viên',   N'0903000012', '2024-05-20', 'ACTIVE', GETDATE()),
(10, 15, N'EMP000015', N'Trịnh Quản Lý',       N'Lễ tân',       N'Lễ tân viên',   N'0904000015', '2024-08-12', 'ACTIVE', GETDATE()),
(11, 16, N'EMP000016', N'Trịnh Quản Lý',       N'Ban giám đốc', N'Quản lý',       N'0904000016', '2023-09-05', 'ACTIVE', GETDATE()),
-- ── email ảo ──
(12, 17, N'EMP000017', N'Quản Trị Viên Hệ Thống', N'Ban quản trị', N'Quản trị viên', N'0900000017', '2023-01-02', 'ACTIVE', GETDATE()),
(13, 18, N'EMP000018', N'Trần Thị Quản Lý',    N'Ban giám đốc', N'Quản lý',       N'0900000018', '2021-04-01', 'ACTIVE', GETDATE()),
(14, 21, N'EMP000021', N'Hoàng Lễ Tân',        N'Lễ tân',       N'Lễ tân viên',   N'0900000021', '2023-03-01', 'ACTIVE', GETDATE()),
(15, 22, N'EMP000022', N'Phạm Thu Trang',      N'Lễ tân',       N'Lễ tân viên',   N'0900000022', '2025-02-17', 'ACTIVE', GETDATE()),
(16, 24, N'EMP000024', N'Vũ Dược Sĩ',          N'Nhà thuốc',    N'Dược sĩ',       N'0900000024', '2021-06-10', 'ACTIVE', GETDATE()),
(17, 25, N'EMP000025', N'Đặng Thị Thanh Thảo', N'Điều dưỡng',   N'Điều dưỡng',    N'0900000025', '2024-07-22', 'ACTIVE', GETDATE()),
(18, 26, N'EMP000026', N'Lý Thị Kim Ngân',     N'Điều dưỡng',   N'Điều dưỡng',    N'0900000026', '2025-03-03', 'ACTIVE', GETDATE());

SET IDENTITY_INSERT staffs OFF;
GO

-- ============================================================================
-- 5. patients — 13 hồ sơ bệnh nhân
--    id 1-5, 9-13 : gắn tài khoản ảo patient1..10@gmail.com
--    id 6         : bệnh nhi vãng lai, KHÔNG có tài khoản (user_id NULL)
--    id 7, 8      : gắn tài khoản email THẬT (Ngô Bệnh Nhân, Lê Bệnh Nhân)
-- ============================================================================
SET IDENTITY_INSERT patients ON;

INSERT INTO patients
    (id, user_id, patient_code, full_name, date_of_birth, gender, phone, email, address,
     cccd, blood_type, allergy_notes, emergency_contact_name, emergency_contact_phone, status, created_at)
VALUES
(1, 27, N'PAT001', N'Bùi Văn Bình',   '1990-03-10', 'MALE',   N'0912000001', N'patient1@gmail.com',
    N'10 Lý Thường Kiệt, Q10, TP.HCM', N'079090001234', 'O',  N'Dị ứng Penicillin',
    N'Bùi Thị Mai', N'0912100001', 'ACTIVE', GETDATE()),

(2, 28, N'PAT002', N'Đinh Thị Hoa',   '1995-08-15', 'FEMALE', N'0912000002', N'patient2@gmail.com',
    N'11 Trần Hưng Đạo, Q5, TP.HCM',   N'079095002345', 'A',  NULL,
    N'Đinh Văn Ba', N'0912100002', 'ACTIVE', GETDATE()),

(3, 29, N'PAT003', N'Lý Văn Minh',    '1982-12-05', 'MALE',   N'0912000003', N'patient3@gmail.com',
    N'12 An Dương Vương, Q5, TP.HCM',  N'079082003456', 'B',  N'Dị ứng Sulfonamide',
    N'Lý Thị Hạnh', N'0912100003', 'ACTIVE', GETDATE()),

(4, 30, N'PAT004', N'Ngô Thị Lan',    '2000-05-20', 'FEMALE', N'0912000004', N'patient4@gmail.com',
    N'13 Nguyễn Văn Cừ, Q5, TP.HCM',   N'079000004567', 'AB', NULL,
    N'Ngô Văn Cường', N'0912100004', 'ACTIVE', GETDATE()),

(5, 31, N'PAT005', N'Tô Văn Dũng',    '1975-07-07', 'MALE',   N'0912000005', N'patient5@gmail.com',
    N'14 Hùng Vương, Q6, TP.HCM',      N'079075005678', 'UNKNOWN', N'Cao huyết áp',
    N'Tô Thị Vân', N'0912100005', 'ACTIVE', GETDATE()),

(6, NULL, N'PAT006', N'Bé Trần Gia Bảo', '2020-08-09', 'MALE', N'0913000099', NULL,
    N'27 Phan Xích Long, Q. Phú Nhuận, TP.HCM', NULL, 'UNKNOWN', NULL,
    N'Trần Văn Phú (bố)', N'0913000099', 'ACTIVE', GETDATE()),

-- Bệnh nhân email THẬT — dùng demo luồng thanh toán (xem mục 31)
(7, 9,  N'PAT007', N'Ngô Bệnh Nhân',  '2001-11-12', 'MALE',   N'0920000002', N'trangthangtuong@gmail.com',
    N'88 Nguyễn Trãi, Q5, TP.HCM',     N'079201009999', 'O',  NULL,
    N'Ngô Văn Tư', N'0920000012', 'ACTIVE', GETDATE()),

(8, 6,  N'PAT008', N'Lê Bệnh Nhân',   '1998-09-05', 'MALE',   N'0912000011', N'dantayf8@gmail.com',
    N'26 Lý Chính Thắng, Q3, TP.HCM',  N'079098008111', 'A',  N'Dị ứng hải sản',
    N'Lê Thị Hoà', N'0912100011', 'ACTIVE', GETDATE()),

(9,  32, N'PAT009', N'Vũ Thị Hồng',     '1993-02-11', 'FEMALE', N'0912000006', N'patient6@gmail.com',
    N'21 Lê Lợi, Q1, TP.HCM',             N'079193009222', 'B',  NULL,
    N'Vũ Văn Thành', N'0912100006', 'ACTIVE', GETDATE()),

(10, 33, N'PAT010', N'Phan Văn Kiên',   '1987-06-23', 'MALE',   N'0912000007', N'patient7@gmail.com',
    N'33 Trường Chinh, Q. Tân Bình, TP.HCM', N'079087010333', 'O', N'Tiểu đường type 2',
    N'Phan Thị Loan', N'0912100007', 'ACTIVE', GETDATE()),

(11, 34, N'PAT011', N'Đỗ Thị Ngọc Ánh', '2002-01-19', 'FEMALE', N'0912000008', N'patient8@gmail.com',
    N'45 Quang Trung, Q. Gò Vấp, TP.HCM', N'079302011444', 'A',  NULL,
    N'Đỗ Văn Hải', N'0912100008', 'ACTIVE', GETDATE()),

(12, 35, N'PAT012', N'Hồ Văn Sang',     '1968-10-04', 'MALE',   N'0912000009', N'patient9@gmail.com',
    N'5 Trần Não, TP. Thủ Đức, TP.HCM',   N'079068012555', 'AB', N'Glocom góc mở đang theo dõi',
    N'Hồ Thị Bích', N'0912100009', 'ACTIVE', GETDATE()),

(13, 36, N'PAT013', N'Mai Thị Thu Hà',  '2011-04-27', 'FEMALE', N'0912000010', N'patient10@gmail.com',
    N'17 Phan Xích Long, Q. Phú Nhuận, TP.HCM', N'079311013666', 'O', NULL,
    N'Mai Văn Trung (bố)', N'0912100010', 'ACTIVE', GETDATE());

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
     badge, benefits, sessions_included, validity_days, service_type, is_active, is_popular, is_lab_service, display_order, created_at)
VALUES
(1, N'Gói Thiền Mắt',
    N'Liệu trình thiền và thư giãn cho mắt, giảm căng thẳng thị giác sau thời gian dài dùng màn hình.',
    350000, 45, 1, 'goi-thien-mat',
    'https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=600&h=360&fit=crop&auto=format',
    N'Chi tiết gói thiền mắt: kết hợp bài tập yoga mắt và kỹ thuật hít thở...',
    N'Mới', N'Giảm căng thẳng và mỏi mắt sau thời gian dài nhìn màn hình
Cải thiện khả năng tập trung và điều tiết mắt
Thư giãn tinh thần, giảm stress thị giác
Hướng dẫn bởi kỹ thuật viên có chuyên môn', 5, 30, 'CARE', 1, 0, 0, 1, GETDATE()),

-- Giá gói 1.000.000đ/8 buổi (~125k/buổi) — PHẢI thấp hơn giá buổi lẻ vãng lai
-- (dịch vụ id 15, 150k/buổi) nhưng không được rẻ phi lý. Giá cũ 250k/8 buổi
-- (~31k/buổi) là sai logic "mua gói rẻ hơn mua lẻ" — đã sửa theo
-- ecms_massage_package_price_patch.sql (xem thêm subscription id 2 ở mục 18).
(2, N'Gói Massage Mắt',
    N'Massage vùng mắt chuyên nghiệp bằng tay kết hợp tinh dầu thiên nhiên, giảm quầng thâm mắt.',
    1000000, 30, 2, 'goi-massage-mat',
    'https://images.unsplash.com/photo-1616394584738-fc6e612e71b9?w=600&h=360&fit=crop&auto=format',
    N'Chi tiết gói massage mắt: giúp lưu thông máu quanh vùng mắt...',
    N'Phổ biến', N'Tăng lưu thông máu quanh vùng mắt
Giảm quầng thâm và bọng mắt
Thư giãn cơ mắt sau ngày dài làm việc
Sử dụng tinh dầu thiên nhiên an toàn cho da', 8, 45, 'CARE', 1, 1, 0, 2, GETDATE()),

(3, N'Gói Chăm Sóc Mắt Toàn Diện',
    N'Kiểm tra thị lực, massage mắt, chiếu đèn hồng ngoại và tư vấn dinh dưỡng cho mắt.',
    1500000, 60, 3, 'goi-cham-soc-mat-toan-dien',
    'https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=600&h=360&fit=crop&auto=format',
    N'Chi tiết gói chăm sóc mắt toàn diện...',
    N'Best Seller', N'Kiểm tra thị lực định kỳ trong suốt liệu trình
Kết hợp massage, chiếu đèn hồng ngoại và tư vấn dinh dưỡng
Theo dõi và điều chỉnh liệu trình theo tình trạng mắt
Đội ngũ kỹ thuật viên và bác sĩ tư vấn chuyên sâu', 10, 60, 'CARE', 1, 1, 0, 3, GETDATE()),

(4, N'Gói Thư Giãn Mắt Công Nghệ Cao',
    N'Máy massage mắt áp suất khí, rung, nhiệt hồng ngoại và nhạc thư giãn phục hồi mắt mệt mỏi.',
    500000, 40, 1, 'goi-thu-gian-mat-cong-nghe-cao',
    'https://images.unsplash.com/photo-1573497491765-dccce02b29df?w=600&h=360&fit=crop&auto=format',
    N'Chi tiết gói thư giãn mắt công nghệ cao...',
    N'Premium', N'Công nghệ áp suất khí, rung và nhiệt hồng ngoại hiện đại
Phục hồi nhanh cho mắt mệt mỏi, khô mắt
Kết hợp âm nhạc thư giãn trong suốt buổi trị liệu
Phù hợp với dân văn phòng, người dùng máy tính nhiều', 6, 30, 'CARE', 1, 0, 0, 4, GETDATE()),

(5, N'Liệu Trình Phục Hồi Thị Lực',
    N'Liệu trình chuyên sâu kết hợp bài tập điều tiết mắt đặc biệt và thiền định sâu.',
    2800000, 90, 4, 'lieu-trinh-phuc-hoi-thi-luc',
    'https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=600&h=360&fit=crop&auto=format',
    N'Chi tiết liệu trình phục hồi thị lực...',
    N'Cao cấp', N'Bài tập điều tiết mắt chuyên sâu theo lộ trình cá nhân hoá
Kết hợp thiền định sâu hỗ trợ phục hồi thị lực
Theo dõi tiến độ qua từng buổi trị liệu
Tư vấn 1-1 với chuyên gia trong suốt liệu trình', 12, 90, 'CARE', 1, 0, 0, 5, GETDATE()),

-- UC-21: dịch vụ "vãng lai" — sessions_included=1, đăng ký + check-out xong là thu tiền
-- ngay (khác gói nhiều buổi đã trả trọn gói lúc đăng ký), dùng để test luồng standalone checkout.
(15, N'Buổi Chăm Sóc Mắt Đơn Lẻ',
    N'Trải nghiệm 1 buổi chăm sóc mắt lẻ, không cần mua trọn gói — thanh toán trực tiếp tại quầy sau khi hoàn tất buổi.',
    150000, 30, 2, 'buoi-cham-soc-mat-don-le',
    'https://images.unsplash.com/photo-1616394584738-fc6e612e71b9?w=600&h=360&fit=crop&auto=format',
    N'Buổi chăm sóc mắt đơn lẻ dành cho khách vãng lai, không ràng buộc mua liệu trình nhiều buổi.',
    N'Vãng lai', N'Trải nghiệm 1 buổi chăm sóc mắt không cần mua trọn gói
Thanh toán trực tiếp tại quầy sau khi hoàn tất buổi
Phù hợp khách muốn dùng thử trước khi mua liệu trình dài', 1, 7, 'CARE', 1, 0, 0, 6, GETDATE()),

-- Dịch vụ khám/chẩn đoán/phẫu thuật (CLINICAL). is_lab_service = 1 → dịch vụ do KTV thực hiện.
(6,  N'Chụp bản đồ giác mạc (Topo)',      N'Phân tích hình thái giác mạc bằng máy Topographer.',       250000,   20, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'CLINICAL', 1, 0, 1, 6,  GETDATE()),
(7,  N'Xét nghiệm sinh hóa máu cơ bản',   N'Xét nghiệm đường huyết, mỡ máu phục vụ tiền phẫu.',        180000,   60, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'CLINICAL', 1, 0, 1, 7,  GETDATE()),
(8,  N'Phẫu thuật đục thủy tinh thể',     N'Phẫu thuật Phaco thay thể thủy tinh nhân tạo.',            15000000, 90, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'CLINICAL', 1, 0, 0, 8,  GETDATE()),
(9,  N'Khám tổng quát mắt',               N'Khám đánh giá tổng thể sức khỏe mắt.',                     200000,   30, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'CLINICAL', 1, 0, 0, 9,  GETDATE()),
(10, N'Đo thị lực (VA/BCVA)',             N'Đo thị lực không kính và có kính chỉnh tốt nhất.',         80000,    10, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'CLINICAL', 1, 0, 1, 10, GETDATE()),
(11, N'Đo khúc xạ tự động',               N'Đo khúc xạ bằng máy Auto-Refractor.',                      100000,   15, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'CLINICAL', 1, 0, 1, 11, GETDATE()),
(12, N'Đo nhãn áp (IOP)',                 N'Đo áp lực nội nhãn bằng Tonometry.',                       100000,   10, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'CLINICAL', 1, 0, 1, 12, GETDATE()),
(13, N'Soi đáy mắt',                      N'Soi đáy mắt (Fundoscopy) đánh giá võng mạc.',              150000,   20, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'CLINICAL', 1, 0, 1, 13, GETDATE()),
(14, N'Chụp OCT',                         N'Chụp cắt lớp quang học OCT võng mạc/thần kinh thị.',       350000,   20, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'CLINICAL', 1, 0, 1, 14, GETDATE());

SET IDENTITY_INSERT services OFF;
GO

-- ============================================================================
-- 6b. rooms — PHẢI seed trước appointments/care_sessions vì 2 bảng đó có room_id.
--    category: CLINICAL_EXAM (khám tổng quát A/B/C, phẫu thuật)
--            | CARE_RECOVERY (chăm sóc & phục hồi)
--            | DIAGNOSTIC_IMAGING (xét nghiệm / chẩn đoán hình ảnh)
--            | OPTICAL_WORKSHOP (xưởng cắt kính)
--    service_id: chỉ gán khi phòng phục vụ ĐÚNG 1 dịch vụ cụ thể; để NULL nếu
--    phòng dùng chung cho nhiều dịch vụ (thay cho bảng room_services cũ).
--    Phân trực nhân sự vào phòng xem mục 27 (staff_room_assignments).
-- ============================================================================
SET IDENTITY_INSERT rooms ON;

INSERT INTO rooms (id, name, category, service_id, capacity, status, created_at) VALUES
(1, N'Phòng khám tổng quát A',                N'CLINICAL_EXAM',      9,    1, 'ACTIVE', GETDATE()),
(2, N'Phòng khám tổng quát B',                N'CLINICAL_EXAM',      9,    1, 'ACTIVE', GETDATE()),
(3, N'Phòng phẫu thuật',                      N'CLINICAL_EXAM',      8,    1, 'ACTIVE', GETDATE()),
(4, N'Phòng chăm sóc & phục hồi 1',           N'CARE_RECOVERY',      NULL, 1, 'ACTIVE', GETDATE()),
(5, N'Phòng chăm sóc & phục hồi 2',           N'CARE_RECOVERY',      NULL, 1, 'ACTIVE', GETDATE()),
(6, N'Phòng xét nghiệm & chẩn đoán hình ảnh', N'DIAGNOSTIC_IMAGING', NULL, 1, 'ACTIVE', GETDATE()),
(7, N'Phòng khám tổng quát C',                N'CLINICAL_EXAM',      9,    1, 'ACTIVE', GETDATE()),
(8, N'Xưởng cắt kính',                        N'OPTICAL_WORKSHOP',   NULL, 2, 'ACTIVE', GETDATE());

SET IDENTITY_INSERT rooms OFF;
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

-- 10 chương trình theo mùa (gộp từ ecms_promotions_seed_patch.sql) — ngày CỐ ĐỊNH
-- trải từ 30/4 đến 3/9/2026 để trang /promotions có đủ 3 nhóm badge trạng thái:
-- ĐÃ KẾT THÚC (id 3-9), ĐANG DIỄN RA (id 10 — tính theo "hôm nay" ~25/7/2026),
-- SẮP DIỄN RA (id 11-12). Dùng để test badge + tìm kiếm trên trang công khai.
INSERT INTO discount_campaigns
    (id, name, description, type, value, voucher_code, valid_from, valid_to,
     min_purchase_amount, max_usage_count, used_count, is_active, thumbnail_url, content, created_at)
VALUES
(3, N'Rực Rỡ Đón Lễ', N'Mở màn chuỗi ưu đãi lớn dịp Đại lễ 30/4 - 1/5.',
    'PERCENTAGE', 20, N'LEHOI0430', '2026-04-30', '2026-05-03',
    300000, 300, 128, 1, NULL,
    N'Mở màn chuỗi ưu đãi lớn dịp Đại lễ 30/4 - 1/5.

Giảm trực tiếp 15% - 20% cho tất cả các dịch vụ và sản phẩm tại phòng khám. Ngoài ra, hoá đơn đạt giá trị tối thiểu 300.000đ sẽ được tặng kèm quà mừng lễ.

Áp dụng cho mọi hình thức đặt lịch, số lượng có hạn.', GETDATE()),

(4, N'Chào Hè Rực Rỡ', N'Khởi động mùa hè và chuẩn bị cho các chuyến du lịch.',
    'PERCENTAGE', 15, N'HELOOK510', '2026-05-10', '2026-05-20',
    NULL, NULL, 76, 1, NULL,
    N'Khởi động mùa hè và chuẩn bị cho các chuyến du lịch cùng Nhãn Khoa Ánh Sao.

Đồng giá nhiều mặt hàng và gói dịch vụ theo chủ đề mùa hè. Đặc biệt giảm sâu hơn cho nhóm khách hàng từ 2 người trở lên — rủ bạn bè, người thân cùng chăm sóc đôi mắt trước mùa du lịch.', GETDATE()),

(5, N'Vui Hè Cùng Bé', N'Nhân ngày Quốc tế Thiếu nhi 1/6 — ưu đãi cho cả gia đình có trẻ em.',
    'PERCENTAGE', 30, N'BEYEU0106', '2026-06-01', '2026-06-05',
    150000, 150, 54, 1, NULL,
    N'Nhân ngày Quốc tế Thiếu nhi 1/6, Nhãn Khoa Ánh Sao dành tặng ưu đãi đặc biệt cho gia đình có trẻ em.

Tặng quà cho bé đi cùng phụ huynh khi khám mắt, đồng thời giảm 30% cho các dịch vụ/sản phẩm dành riêng cho trẻ em (kính mắt, kiểm tra tật khúc xạ...).', GETDATE()),

(6, N'Săn Sale Giữa Hè', N'Chương trình Mid-Summer Sale kích cầu tiêu dùng giữa tháng 6.',
    'PERCENTAGE', 50, N'MIDSALE50', '2026-06-10', '2026-06-15',
    NULL, 100, 97, 1, NULL,
    N'Mid-Summer Sale — kích cầu tiêu dùng giữa tháng 6.

Flash Sale theo khung giờ vàng trong ngày (10h-11h và 15h-16h) với mức giảm lên đến 50% cho danh mục sản phẩm/dịch vụ hot nhất tại phòng khám. Số lượng ưu đãi giới hạn theo từng khung giờ, nhanh tay đặt lịch kẻo lỡ!', GETDATE()),

(7, N'Tri Ân Ngày Của Bố', N'Dịp Father''s Day — ưu đãi dành cho phái mạnh và các bậc phụ huynh.',
    'FIXED_AMOUNT', 100000, N'FATHER2026', '2026-06-15', '2026-06-21',
    300000, 200, 41, 1, NULL,
    N'Nhân dịp Father''s Day (chủ nhật thứ 3 của tháng 6), Nhãn Khoa Ánh Sao tri ân các quý ông và bậc phụ huynh.

Giảm ngay 50.000đ - 100.000đ cho các gói dịch vụ/quà tặng dành cho nam giới, hoặc tặng Voucher sử dụng cho lần khám tiếp theo.', GETDATE()),

(8, N'Gia Đình Bền Chặt', N'Chào mừng Ngày Gia đình Việt Nam 28/6.',
    'PERCENTAGE', 10, N'GIADINH628', '2026-06-25', '2026-06-30',
    NULL, NULL, 33, 1, NULL,
    N'Chào mừng Ngày Gia đình Việt Nam (28/6), Nhãn Khoa Ánh Sao gửi tặng ưu đãi combo gia đình.

Áp dụng chương trình "Đi 4 tính tiền 3" cho cả gia đình khi cùng đăng ký khám/dịch vụ, hoặc giảm thêm 10% khi đăng ký mua theo nhóm gia đình từ 3 người trở lên.', GETDATE()),

(9, N'Siêu Sale Siêu Đôi 7/7', N'Ngày đôi tháng 7 — đợt cao điểm mua sắm giữa hè.',
    'PERCENTAGE', 15, N'DOUBLE77', '2026-07-05', '2026-07-09',
    200000, 500, 212, 1, NULL,
    N'Ngày đôi 7/7 — đợt cao điểm mua sắm giữa hè.

Tung loạt Voucher giảm giá kép: vừa giảm % trực tiếp, vừa tặng kèm quà khi thanh toán trực tuyến qua ứng dụng hoặc website. Nhập mã DOUBLE77 khi đặt lịch để nhận ưu đãi.', GETDATE()),

(10, N'Năng Lượng Mùa Hè', N'Chương trình xả kho / chăm sóc hè cuối tháng 7 — Mua 1 Tặng 1.',
    'PERCENTAGE', 50, N'MUA1TANG1', '2026-07-20', '2026-07-30',
    NULL, 150, 18, 1, NULL,
    N'Chương trình chăm sóc hè cuối tháng 7 dành cho khách hàng thân thiết.

Mua 1 Tặng 1 cho các gói chăm sóc mắt được chọn, hoặc tặng kèm gói chăm sóc/phụ kiện hỗ trợ khi đăng ký dịch vụ trong thời gian khuyến mãi.', GETDATE()),

(11, N'Tiếp Sức Đến Trường', N'Mùa Back-to-School chuẩn bị cho năm học mới.',
    'PERCENTAGE', 15, N'BACKTOSCHOOL', '2026-08-10', '2026-08-20',
    NULL, 300, 0, 1, NULL,
    N'Mùa Back-to-School — chuẩn bị đôi mắt khoẻ mạnh cho năm học mới.

Ưu đãi 10% - 15% dành riêng cho học sinh, sinh viên và giáo viên khi xuất trình thẻ học sinh/sinh viên/giáo viên hợp lệ tại quầy lễ tân.', GETDATE()),

(12, N'Mừng Đại Lễ Quốc Khánh', N'Chương trình bùng nổ khép lại mùa hè dịp Quốc khánh 2/9.',
    'PERCENTAGE', 50, N'QUOCKHANH29', '2026-08-28', '2026-09-03',
    NULL, 500, 0, 1, NULL,
    N'Chương trình bùng nổ khép lại mùa hè, chào mừng Quốc khánh 2/9.

Đại tiệc ưu đãi: giảm giá lên tới 50% cho nhiều dịch vụ, tặng Voucher tri ân dùng cho hoá đơn tiếp theo, và cơ hội bốc thăm may mắn trúng thưởng dành cho khách hàng trong thời gian chương trình diễn ra.', GETDATE());

SET IDENTITY_INSERT discount_campaigns OFF;
GO

-- ============================================================================
-- 9. appointments — 9 lịch hẹn đủ trạng thái
--    (4 COMPLETED quá khứ, IN_PROGRESS + WAITING hôm nay,
--     CONFIRMED ngày mai, PENDING ngày kia, CANCELLED)
--    check_in_by / booked_by / cancelled_by = users.id:
--      3  = Lê Thị Bích Ngân (lễ tân) | 8 = Ngô Bạch Thắng (lễ tân)
--      27-31 = tài khoản bệnh nhân patient1..5@gmail.com
-- ============================================================================
SET IDENTITY_INSERT appointments ON;

DECLARE @d_m3 DATETIME2 = CAST(CAST(DATEADD(DAY,-3, GETDATE()) AS DATE) AS DATETIME2);
DECLARE @d_m2 DATETIME2 = CAST(CAST(DATEADD(DAY,-2, GETDATE()) AS DATE) AS DATETIME2);
DECLARE @d_0  DATETIME2 = CAST(CAST(GETDATE()               AS DATE) AS DATETIME2);
DECLARE @d_p1 DATETIME2 = CAST(CAST(DATEADD(DAY, 1, GETDATE()) AS DATE) AS DATETIME2);
DECLARE @d_p2 DATETIME2 = CAST(CAST(DATEADD(DAY, 2, GETDATE()) AS DATE) AS DATETIME2);

INSERT INTO appointments
    (id, patient_id, doctor_id, service_id, room_id, appointment_time, time_slot, type, status,
     notes, queue_number, check_in_time, check_in_by, booked_by,
     cancel_reason, cancelled_by, cancelled_at, created_at)
VALUES
-- Đã hoàn thành (có bệnh án + hóa đơn)
(1, 1, 1, 9,  1, DATEADD(MINUTE, 7*60+45, @d_m3), N'07:30 - 08:00', 'ONLINE',  'COMPLETED',
    N'Mắt mờ, nhức đầu khi nhìn màn hình', 1, DATEADD(MINUTE, 7*60+40, @d_m3), 3, 27,
    NULL, NULL, NULL, DATEADD(DAY,-4,GETDATE())),

(2, 2, 1, 9,  1, DATEADD(MINUTE, 8*60+30, @d_m3), N'08:30 - 09:00', 'WALK_IN', 'COMPLETED',
    N'Mắt đỏ, chảy ghèn 3 ngày',           2, DATEADD(MINUTE, 8*60+25, @d_m3), 3, NULL,
    NULL, NULL, NULL, DATEADD(DAY,-3,GETDATE())),

(3, 3, 2, 11, 2, DATEADD(MINUTE, 9*60,    @d_m3), N'09:00 - 09:30', 'ONLINE',  'COMPLETED',
    N'Mờ mắt khi nhìn xa, khó lái xe ban đêm', 3, DATEADD(MINUTE, 8*60+55, @d_m3), 8, 29,
    NULL, NULL, NULL, DATEADD(DAY,-5,GETDATE())),

(4, 4, 3, 8,  3, DATEADD(MINUTE, 7*60+30, @d_m2), N'07:30 - 09:00', 'ONLINE',  'COMPLETED',
    N'Phẫu thuật đục thủy tinh thể mắt phải', 1, DATEADD(MINUTE, 7*60+20, @d_m2), 3, 30,
    NULL, NULL, NULL, DATEADD(DAY,-7,GETDATE())),

-- Hôm nay
(5, 5, 1, 9,  1, DATEADD(MINUTE, 9*60,    @d_0),  N'09:00 - 09:30', 'WALK_IN', 'IN_PROGRESS',
    N'Khô mắt, cộm xốn kéo dài',           1, DATEADD(MINUTE, 8*60+55, @d_0), 3, NULL,
    NULL, NULL, NULL, GETDATE()),

(6, 6, 1, 10, 1, DATEADD(MINUTE, 10*60,   @d_0),  N'10:00 - 10:30', 'WALK_IN', 'WAITING',
    N'Bé kiểm tra thị lực lần đầu (bố đưa đi)', 2, DATEADD(MINUTE, 9*60+55, @d_0), 3, NULL,
    NULL, NULL, NULL, GETDATE()),

-- Sắp tới
(7, 1, 2, 6,  2, DATEADD(MINUTE, 9*60,    @d_p1), N'09:00 - 09:30', 'ONLINE',  'CONFIRMED',
    N'Tái khám khúc xạ, chụp Topo theo hẹn', NULL, NULL, NULL, 27,
    NULL, NULL, NULL, GETDATE()),

(8, 2, 3, 8,  3, DATEADD(MINUTE, 7*60+30, @d_p2), N'07:30 - 08:00', 'ONLINE',  'PENDING',
    N'Tư vấn phẫu thuật Lasik',            NULL, NULL, NULL, 28,
    NULL, NULL, NULL, GETDATE()),

-- Đã hủy (bệnh nhân tự hủy)
(9, 3, 1, 9,  NULL, DATEADD(MINUTE, 10*60,   @d_p1), N'10:00 - 10:30', 'ONLINE',  'CANCELLED',
    NULL, NULL, NULL, NULL, 29,
    N'Bệnh nhân bận việc đột xuất', 29, GETDATE(), GETDATE());

SET IDENTITY_INSERT appointments OFF;
GO

-- ============================================================================
-- 10. medical_records — bệnh án cho 4 lịch hẹn COMPLETED (appt 1-4)
--     locked_by = users.id của bác sĩ khóa hồ sơ
--     (doctors.id 1 → user 10 | 2 → user 13 | 3 → user 19 | 4 → user 20)
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
    550000, DATEADD(DAY,-3,GETDATE()), 10, 'COMPLETED', DATEADD(DAY,-3,GETDATE())),

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
    328000, DATEADD(DAY,-3,GETDATE()), 10, 'COMPLETED', DATEADD(DAY,-3,GETDATE())),

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
    100000, DATEADD(DAY,-3,GETDATE()), 13, 'COMPLETED', DATEADD(DAY,-3,GETDATE())),

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
    15180000, DATEADD(DAY,-2,GETDATE()), 19, 'COMPLETED', DATEADD(DAY,-2,GETDATE()));

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
-- 12. lens_types — danh mục loại tròng kính (MỚI: trước đây chưa có seed)
-- ============================================================================
SET IDENTITY_INSERT lens_types ON;

-- id 1-9: danh mục chuẩn (gộp từ insert_lens_types.sql của nhóm)
-- id 10-11: phân khúc học sinh/giá rẻ (gộp từ "Thêm loại kính.sql") — bộ chuẩn
--           không có mức dưới 300k nên giữ lại 2 dòng này cho đủ dải giá.
INSERT INTO lens_types (id, name, description, base_price, status) VALUES
(1, N'Đơn tròng (Single Vision)',            N'Tròng kính có một tiêu cự duy nhất, dùng để nhìn xa, nhìn gần hoặc nhìn trung gian.', 300000,  'ACTIVE'),
(2, N'Hai tròng (Bifocal)',                  N'Tròng kính có hai tiêu cự (nhìn xa và nhìn gần) với đường ranh giới phân biệt rõ ràng.', 500000,  'ACTIVE'),
(3, N'Đa tròng (Progressive)',               N'Tròng kính cung cấp tầm nhìn liền mạch từ xa đến gần mà không có đường phân giới, mang lại tính thẩm mỹ cao.', 1200000, 'ACTIVE'),
(4, N'Chống ánh sáng xanh (Blue Control)',   N'Tròng kính phủ lớp cắt hoặc lọc ánh sáng xanh có hại từ màn hình điện tử, giúp giảm nhức mỏi mắt.', 650000,  'ACTIVE'),
(5, N'Đổi màu (Photochromic/Transitions)',   N'Tròng kính tự động chuyển màu tối khi ra nắng và trong suốt trở lại khi vào nhà, tiện lợi cho người hay di chuyển ngoài trời.', 850000,  'ACTIVE'),
(6, N'Phân cực chống chói (Polarized)',      N'Tròng kính có khả năng loại bỏ ánh sáng phản chiếu, chống lóa hiệu quả, phù hợp cho người hay lái xe hoặc hoạt động thể thao ngoài trời.', 900000,  'ACTIVE'),
(7, N'Tròng mỏng - Chiết suất cao (High Index)', N'Tròng kính được làm từ vật liệu chiết suất cao, giúp tròng mỏng, nhẹ hơn và thẩm mỹ hơn dành cho người có độ cận/viễn cao.', 1500000, 'ACTIVE'),
(8, N'Chống mỏi mắt (Anti-Fatigue)',         N'Tròng kính có độ hỗ trợ điều tiết ở vùng nhìn gần, giúp mắt thoải mái hơn khi sử dụng các thiết bị kỹ thuật số trong thời gian dài.', 750000,  'ACTIVE'),
(9, N'Tròng kiểm soát cận thị (Myopia Control)', N'Tròng kính thiết kế đặc biệt giúp làm chậm quá trình tăng độ cận ở trẻ em.', 2500000, 'ACTIVE'),
(10, N'Đơn tròng phổ thông (Economy)',       N'Tròng kính váng dầu tiêu chuẩn, giá học sinh.',                          120000,  'ACTIVE'),
(11, N'Đơn tròng chống xước cơ bản',         N'Phủ lớp chống phản quang và trầy xước cơ bản.',                          180000,  'ACTIVE');

SET IDENTITY_INSERT lens_types OFF;
GO

-- ============================================================================
-- 13. eyeglass_prescriptions — đơn kính (OD = mắt phải, OS = mắt trái)
--     lens_type_id trỏ tới bảng lens_types ở trên.
-- ============================================================================
SET IDENTITY_INSERT eyeglass_prescriptions ON;

INSERT INTO eyeglass_prescriptions
    (id, medical_record_id, doctor_id, patient_id,
     od_sph, od_cyl, od_axis, od_add, os_sph, os_cyl, os_axis, os_add,
     pd, lens_type_id, notes, status, request_in_clinic_fabrication, created_at)
VALUES
-- Đơn kính MR1 — đã phát (đã cắt tại phòng khám → có eyeglass_orders id 1)
(1, 1, 1, 1,
    -3.00, -0.75, 175, NULL, -2.50, -0.50, 180, NULL,
    63.5, 1,
    N'Kính cận đơn tròng, phủ chống UV + chống phản chiếu.', 'DISPENSED', 1, DATEADD(DAY,-3,GETDATE())),

-- Đơn kính MR3 — đang cắt tại xưởng (eyeglass_orders id 2). lens_type 4 = Blue Control.
(2, 3, 2, 3,
    -3.25, -0.50, 165, NULL, -2.75, -0.50, 170, NULL,
    62.0, 4,
    N'Cận + loạn nhẹ. Tư vấn thêm kính áp tròng toric.', 'IN_PRODUCTION', 1, DATEADD(DAY,-3,GETDATE()));

SET IDENTITY_INSERT eyeglass_prescriptions OFF;
GO

-- ============================================================================
-- 14. lab_orders — LƯU Ý: ordered_by = doctors.id, assigned_to = lab_technicians.id
-- ============================================================================
SET IDENTITY_INSERT lab_orders ON;

INSERT INTO lab_orders
    (id, medical_record_id, ordered_by, assigned_to, service_id, notes, priority, status, completed_at, created_at)
VALUES
-- XN tiền phẫu cho MR4 — bác sĩ 3 chỉ định, KTV 1 thực hiện, đã duyệt
(1, 4, 3, 1, 7, N'Xét nghiệm tiền phẫu: sinh hóa máu. Ưu tiên trả kết quả trong ngày.',
    'EMERGENCY', 'APPROVED', DATEADD(DAY,-2,GETDATE()), DATEADD(DAY,-2,GETDATE())),

-- Chụp OCT cho MR1 — đã duyệt
(2, 1, 1, 1, 14, N'Chụp OCT hoàng điểm để loại trừ thoái hóa hoàng điểm.',
    'PRIMARY', 'APPROVED', DATEADD(DAY,-3,GETDATE()), DATEADD(DAY,-3,GETDATE())),

-- Soi đáy mắt cho MR2 — đang chờ tiếp nhận (giao KTV 2)
(3, 2, 1, 2, 13, N'Soi đáy mắt loại trừ viêm màng bồ đào.',
    'PRIMARY', 'PENDING', NULL, DATEADD(DAY,-3,GETDATE()));

SET IDENTITY_INSERT lab_orders OFF;
GO

-- ============================================================================
-- 15. lab_results — uploaded_by = lab_technicians.id, reviewed_by = doctors.id
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
-- 16. invoices + invoice_details (cho 4 lịch hẹn COMPLETED)
--     issued_by = users.id của lễ tân (3 = Lê Thị Bích Ngân, 8 = Ngô Bạch Thắng)
-- ============================================================================
SET IDENTITY_INSERT invoices ON;

INSERT INTO invoices
    (id, appointment_id, patient_id, invoice_code,
     service_fee, lab_fee, medicine_fee, sub_total, discount_amount, tax, total_amount,
     payment_method, payment_status, issued_by, paid_at, generated_at, status, created_at)
VALUES
-- HĐ1: khám tổng quát 200k + chụp OCT 350k
(1, 1, 1, N'INV-2026-0001', 200000, 350000, 0, 550000, 0, 0, 550000,
    'CASH',    'PAID', 3, DATEADD(DAY,-3,GETDATE()), DATEADD(DAY,-3,GETDATE()), 'ISSUED', DATEADD(DAY,-3,GETDATE())),

-- HĐ2: khám 200k + thuốc 128k
(2, 2, 2, N'INV-2026-0002', 200000, 0, 128000, 328000, 0, 0, 328000,
    'VIET_QR', 'PAID', 3, DATEADD(DAY,-3,GETDATE()), DATEADD(DAY,-3,GETDATE()), 'ISSUED', DATEADD(DAY,-3,GETDATE())),

-- HĐ3: đo khúc xạ 100k
(3, 3, 3, N'INV-2026-0003', 100000, 0, 0, 100000, 0, 0, 100000,
    'CASH',    'PAID', 8, DATEADD(DAY,-3,GETDATE()), DATEADD(DAY,-3,GETDATE()), 'ISSUED', DATEADD(DAY,-3,GETDATE())),

-- HĐ4: phẫu thuật 15tr + XN tiền phẫu 180k
(4, 4, 4, N'INV-2026-0004', 15000000, 180000, 0, 15180000, 0, 0, 15180000,
    'VIET_QR', 'PAID', 3, DATEADD(DAY,-2,GETDATE()), DATEADD(DAY,-2,GETDATE()), 'ISSUED', DATEADD(DAY,-2,GETDATE()));

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
-- 17. payment_transactions (MỚI) — giao dịch chuyển khoản webhook đổ về (UC-22)
--     MATCHED         : khớp đúng invoice_code + số tiền → tự gạch nợ
--     AMOUNT_MISMATCH : đúng mã hóa đơn nhưng chuyển thiếu/thừa tiền
--     UNMATCHED       : nội dung không chứa mã hóa đơn nào → kế toán đối soát tay
-- ============================================================================
SET IDENTITY_INSERT payment_transactions ON;

INSERT INTO payment_transactions
    (id, gateway_txn_id, gateway, invoice_id, matched_invoice_code, amount, content,
     account_number, reference_code, transfer_type, status, note, transaction_date, received_at)
VALUES
(1, N'SEPAY-1000001', N'SEPAY', 2, N'INV-2026-0002', 328000,
    N'CT DEN:INV-2026-0002 THANH TOAN KHAM MAT', N'0123456789', N'FT26001A', 'IN',
    'MATCHED', N'Khớp tự động qua webhook.', DATEADD(DAY,-3,GETDATE()), DATEADD(DAY,-3,GETDATE())),

(2, N'SEPAY-1000002', N'SEPAY', 4, N'INV-2026-0004', 15180000,
    N'CT DEN:INV-2026-0004 THANH TOAN PHAU THUAT', N'0123456789', N'FT26002B', 'IN',
    'MATCHED', N'Khớp tự động qua webhook.', DATEADD(DAY,-2,GETDATE()), DATEADD(DAY,-2,GETDATE())),

(3, N'SEPAY-1000003', N'SEPAY', NULL, NULL, 500000,
    N'NGUYEN VAN A CHUYEN TIEN', N'0123456789', N'FT26003C', 'IN',
    'UNMATCHED', N'Nội dung chuyển khoản không có mã hóa đơn — chờ kế toán đối soát.',
    DATEADD(DAY,-1,GETDATE()), DATEADD(DAY,-1,GETDATE())),

(4, N'SEPAY-1000004', N'SEPAY', 3, N'INV-2026-0003', 50000,
    N'CT DEN:INV-2026-0003 TT MOT PHAN', N'0123456789', N'FT26004D', 'IN',
    'AMOUNT_MISMATCH', N'Chuyển 50.000đ nhưng hóa đơn 100.000đ — cần xử lý tay.',
    DATEADD(DAY,-1,GETDATE()), DATEADD(DAY,-1,GETDATE()));

SET IDENTITY_INSERT payment_transactions OFF;
GO

-- ============================================================================
-- 18. patient_service_subscriptions + care_sessions (gói CARE đã mua)
--     care_sessions.nurse_id = users.id của điều dưỡng (4 = Lê Điều Dưỡng)
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
-- final_price = 1.000.000 × 0.9 = 900.000 (khớp giá gốc mới của dịch vụ id 2)
(2, 2, 2, 8, 0, CAST(DATEADD(DAY,-5,GETDATE()) AS DATE), CAST(DATEADD(DAY,40,GETDATE()) AS DATE),
    'ACTIVE', 1, 900000, N'Áp dụng voucher SUMMER10 (giảm 10%)', DATEADD(DAY,-5,GETDATE())),

-- BN8 (Lê Bệnh Nhân — email thật) mua buổi lẻ vãng lai, thu tiền lúc check-out (UC-21)
(3, 8, 15, 1, 0, CAST(GETDATE() AS DATE), CAST(DATEADD(DAY,7,GETDATE()) AS DATE),
    'ACTIVE', NULL, 150000, N'Dịch vụ vãng lai — thanh toán tại quầy sau khi hoàn tất buổi.', GETDATE());

SET IDENTITY_INSERT patient_service_subscriptions OFF;
GO

SET IDENTITY_INSERT care_sessions ON;

DECLARE @cs_m14 DATETIME2 = DATEADD(MINUTE, 10*60, CAST(CAST(DATEADD(DAY,-14,GETDATE()) AS DATE) AS DATETIME2));
DECLARE @cs_m7  DATETIME2 = DATEADD(MINUTE, 10*60, CAST(CAST(DATEADD(DAY,-7, GETDATE()) AS DATE) AS DATETIME2));
DECLARE @cs_p2  DATETIME2 = DATEADD(MINUTE, 10*60, CAST(CAST(DATEADD(DAY, 2, GETDATE()) AS DATE) AS DATETIME2));
DECLARE @cs_0   DATETIME2 = DATEADD(MINUTE, 14*60, CAST(CAST(GETDATE() AS DATE) AS DATETIME2));

INSERT INTO care_sessions
    (id, subscription_id, patient_id, nurse_id, room_id, scheduled_date_time, status, session_number,
     notes, nurse_notes, completed_at, assigned_at, created_at)
VALUES
(1, 1, 1, 4, 4, @cs_m14, 'COMPLETED', 1,
    NULL, N'Buổi đầu: kiểm tra thị lực + massage 30 phút, bệnh nhân phản hồi tốt.',
    DATEADD(MINUTE, 60, @cs_m14), DATEADD(DAY,-15,GETDATE()), DATEADD(DAY,-15,GETDATE())),

(2, 1, 1, 4, 4, @cs_m7,  'COMPLETED', 2,
    NULL, N'Buổi 2: chiếu đèn hồng ngoại, hướng dẫn bài tập điều tiết tại nhà.',
    DATEADD(MINUTE, 60, @cs_m7),  DATEADD(DAY,-8,GETDATE()),  DATEADD(DAY,-8,GETDATE())),

(3, 1, 1, NULL, NULL, @cs_p2, 'BOOKED', 3,
    N'Bệnh nhân đặt buổi 3 qua app', NULL,
    NULL, NULL, GETDATE()),

-- Buổi vãng lai của BN8 hôm nay — điều dưỡng ảo nurse1 phụ trách (phòng 5)
(4, 3, 8, 25, 5, @cs_0, 'BOOKED', 1,
    N'Buổi lẻ đăng ký tại quầy, thu tiền sau khi hoàn tất.', NULL,
    NULL, GETDATE(), GETDATE());

SET IDENTITY_INSERT care_sessions OFF;
GO

-- ============================================================================
-- 19. service_registrations (UC-46 — lễ tân đăng ký dịch vụ cho bệnh nhân)
--     registered_by = users.id của lễ tân
-- ============================================================================
SET IDENTITY_INSERT service_registrations ON;

INSERT INTO service_registrations
    (id, service_id, patient_id, registered_by, registration_date, status, notes, created_at)
VALUES
(1, 1, 4, 3, CAST(GETDATE() AS DATE),               'PENDING',   N'Bệnh nhân muốn trải nghiệm thử gói thiền mắt.', GETDATE()),
(2, 4, 5, 3, CAST(DATEADD(DAY,1,GETDATE()) AS DATE),'CONFIRMED', NULL, GETDATE()),
(3, 15, 8, 8, CAST(GETDATE() AS DATE),              'CONFIRMED', N'Đăng ký buổi chăm sóc mắt đơn lẻ (vãng lai).', GETDATE());

SET IDENTITY_INSERT service_registrations OFF;
GO

-- ============================================================================
-- 20. notifications (UC-13 — broadcast lễ tân + nhắm riêng bệnh nhân)
--     target_user_id = users.id (27 = patient1, 28 = patient2)
--     related_appointment_id + related_entity_type: cặp "id thực thể + loại thực thể".
--     Tên cột related_appointment_id là DI SẢN — nó mang id của bất kỳ loại nào,
--     phải đọc kèm related_entity_type mới biết trỏ tới đâu (xem ghi chú ở schema).
-- ============================================================================
SET IDENTITY_INSERT notifications ON;

INSERT INTO notifications
    (id, message, target_role, target_user_id, related_appointment_id, related_entity_type, is_read, created_at)
VALUES
(1, N'Đã gửi nhắc lịch cho bệnh nhân Bùi Văn Bình',      N'RECEPTIONIST', NULL, 7, N'APPOINTMENT', 0, GETDATE()),
(2, N'Đã gửi nhắc lịch cho bệnh nhân Đinh Thị Hoa',      N'RECEPTIONIST', NULL, 8, N'APPOINTMENT', 0, GETDATE()),
(3, N'Bệnh nhân Tô Văn Dũng đã check-in, đang chờ khám', N'RECEPTIONIST', NULL, 5, N'APPOINTMENT', 1, GETDATE()),
(4, N'Bạn có lịch khám sắp tới. Nhấn để xem chi tiết lịch hẹn.', NULL, 27, 7, N'APPOINTMENT', 0, GETDATE()),
(5, N'Bạn có lịch khám sắp tới. Nhấn để xem chi tiết lịch hẹn.', NULL, 28, 8, N'APPOINTMENT', 0, GETDATE()),
-- 3 thông báo trỏ tới thực thể KHÁC lịch hẹn — để test điều hướng theo related_entity_type
(6, N'Có đơn kính mới cần cắt tại xưởng.',               N'PHARMACIST',   NULL, 2,  N'EYEGLASS_ORDER', 0, GETDATE()),
(7, N'Buổi chăm sóc mắt của bạn đã được xếp lịch hôm nay.', NULL, 6,  4,  N'CARE_SESSION', 0, GETDATE()),
(8, N'Chương trình "Năng Lượng Mùa Hè" đang diễn ra — Mua 1 Tặng 1.', NULL, 27, 10, N'PROMOTION', 0, GETDATE());

SET IDENTITY_INSERT notifications OFF;
GO

-- ============================================================================
-- 21. blog_categories (danh mục hiển thị ở sidebar trang Blog)
-- ============================================================================
SET IDENTITY_INSERT blog_categories ON;

INSERT INTO blog_categories (id, name, slug, display_order)
VALUES
(1, N'Tin tức - sự kiện', N'tin-tuc-su-kien', 1),
(2, N'Cẩm nang sức khỏe', N'cam-nang-suc-khoe', 2),
(3, N'Công nghệ nhãn khoa', N'cong-nghe-nhan-khoa', 3),
(4, N'Dịch vụ tại ECMS', N'dich-vu-tai-ecms', 4);

SET IDENTITY_INSERT blog_categories OFF;
GO

-- ============================================================================
-- 22. blog_posts — author_id = users.id của bác sĩ
--     (10 = Thái Khắc Hữu Đức, 13 = Trịnh Đình Tuấn, 19 = BS. Lê Minh Châu)
-- ============================================================================
SET IDENTITY_INSERT blog_posts ON;

INSERT INTO blog_posts (id, title, slug, content, thumbnail_url, author_id, category_id, status, published_at, created_at)
VALUES
(1, N'5 Dấu hiệu cảnh báo bệnh tăng nhãn áp bạn không nên bỏ qua',
    N'5-dau-hieu-canh-bao-tang-nhan-ap',
    N'Tăng nhãn áp thường được gọi là "kẻ trộm thị giác" vì tiến triển âm thầm. Chú ý 5 dấu hiệu: (1) Mờ mắt thoáng qua, (2) Đau đầu phía trán, (3) Nhìn thấy quầng sáng quanh đèn, (4) Thu hẹp thị trường ngoại vi, (5) Buồn nôn kèm đau mắt. Khám nhãn áp định kỳ là cách phát hiện sớm hiệu quả nhất.',
    'https://images.unsplash.com/photo-1512290923902-8a9f81dc236c?w=600&h=360&fit=crop&auto=format',
    10, 2, 'PUBLISHED', DATEADD(DAY,-10,GETDATE()), DATEADD(DAY,-12,GETDATE())),

(2, N'Kính áp tròng: Những điều cần biết để bảo vệ mắt',
    N'kinh-ap-trong-nhung-dieu-can-biet',
    N'Kính áp tròng tiện lợi nhưng sử dụng sai cách rất nguy hiểm. Nguyên tắc vàng: (1) Rửa tay trước khi đeo/tháo, (2) Không đeo khi ngủ, (3) Không dùng nước máy thay nước muối rửa kính, (4) Thay kính đúng chu kỳ, (5) Tháo ngay khi mắt đỏ hoặc đau.',
    'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=600&h=360&fit=crop&auto=format',
    13, 4, 'PUBLISHED', DATEADD(DAY,-5,GETDATE()), DATEADD(DAY,-7,GETDATE())),

(3, N'Phẫu thuật Phaco điều trị đục thể thủy tinh — Quy trình và kết quả',
    N'phau-thuat-phaco-duc-the-thuy-tinh',
    N'Đục thể thủy tinh là nguyên nhân hàng đầu gây mù lòa có thể phòng ngừa. Phẫu thuật Phaco chỉ mất 15-20 phút, không cần nằm viện, bệnh nhân phục hồi thị lực trong 24-48 giờ. Bài viết này giải thích chi tiết quy trình và những điều cần chuẩn bị.',
    'https://images.unsplash.com/photo-1551601651-2a8555f1a136?w=600&h=360&fit=crop&auto=format',
    19, 3, 'PUBLISHED', DATEADD(DAY,-6,GETDATE()), DATEADD(DAY,-9,GETDATE())),

(4, N'4 dấu hiệu ung thư mắt dễ nhầm với bệnh mắt thông thường',
    N'4-dau-hieu-ung-thu-mat-de-nham-voi-benh-mat-thong-thuong',
    N'Ung thư mắt là bệnh lý hiếm gặp nhưng nguy hiểm, có thể đe dọa thị lực và tính mạng nếu không được phát hiện sớm. Điều đáng lo ngại là nhiều triệu chứng ban đầu rất dễ bị nhầm lẫn với các bệnh mắt thông thường. Dưới đây là 4 dấu hiệu cảnh báo cần lưu ý:

1. Mờ mắt: Thị lực thay đổi đột ngột hoặc từ từ ở một bên mắt, không cải thiện dù đã nghỉ ngơi. Nhiều người nhầm với cận thị hay mỏi mắt, nhưng nếu tình trạng chỉ xảy ra ở một mắt và không thuyên giảm, đây có thể là dấu hiệu của khối u hắc mạc (melanoma) đang phát triển bên trong mắt, chèn ép võng mạc và làm biến dạng hình ảnh.

2. Xuất hiện đốm đen trong tầm nhìn: Các đốm đen, "ruồi bay" thường được xem là hiện tượng lão hóa bình thường. Tuy nhiên, khi các đốm này trở nên rõ rệt, kéo dài hoặc tăng nhanh về số lượng, đó có thể là dấu hiệu của khối u đang hình thành, gây xuất huyết hoặc thay đổi cấu trúc dịch kính.

3. Thay đổi màu sắc con ngươi: Con ngươi bình thường có màu đen và phản xạ tốt với ánh sáng. Xuất hiện đốm trắng hoặc ánh sáng bất thường trong con ngươi — đặc biệt ở trẻ em — có thể là dấu hiệu của u nguyên bào võng mạc (retinoblastoma), rất dễ nhầm với dị tật bẩm sinh thông thường.

4. Đau nhức hoặc cảm giác căng tức trong mắt: Ung thư mắt giai đoạn đầu thường không gây đau. Khi khối u phát triển và xâm lấn mô xung quanh, người bệnh có thể cảm thấy đau nhức phía sau mắt, dễ nhầm với đau đầu hoặc tăng nhãn áp thông thường.

Khi nhận thấy các dấu hiệu bất thường kéo dài, người bệnh nên đến khám chuyên khoa mắt sớm để được chẩn đoán và điều trị kịp thời.',
    'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=600&h=360&fit=crop&auto=format',
    10, 1, 'PUBLISHED', DATEADD(DAY,-2,GETDATE()), DATEADD(DAY,-3,GETDATE())),

(5, N'12 dấu hiệu ở mắt cảnh báo bệnh nghiêm trọng',
    N'12-dau-hieu-o-mat-canh-bao-benh-nghiem-trong',
    N'Đôi mắt là bộ phận nhạy cảm của cơ thể, nhưng nhiều triệu chứng xuất hiện ở mắt không chỉ là bệnh về mắt mà còn cảnh báo những bệnh lý nghiêm trọng khác trong cơ thể. Dưới đây là 12 dấu hiệu cần đặc biệt lưu ý:

1. Mù thoáng qua: Có thể là dấu hiệu thiếu máu cục bộ tạm thời, cảnh báo nguy cơ đột quỵ, cần được cấp cứu ngay.

2. Mờ mắt sau khi ăn nhiều đường: Lượng đường trong máu tăng cao làm thủy tinh thể sưng phồng, cần xét nghiệm tiểu đường; tình trạng lặp lại có thể dẫn đến đục thủy tinh thể.

3. Nhìn thấy một điểm cố định trong tầm nhìn: Đây là dấu hiệu cấp cứu, có thể liên quan đến khối u ác tính sau mắt hoặc u não.

4. Một mắt ngày càng yếu đi: Do mạch máu trong mắt bị rò rỉ hoặc tắc nghẽn, có thể là dấu hiệu cảnh báo nguy cơ nhồi máu cơ tim và đột quỵ.

5. Mắt bị lé đột ngột: Có thể báo hiệu tăng áp lực nội sọ hoặc đột quỵ.

6. Hoa mắt khi đứng lên đột ngột: Cho thấy lưu lượng máu đến mắt, dây thần kinh thị giác hoặc não bị giảm, gợi ý huyết áp thấp hoặc bệnh lý mạch máu.

7. Thị lực thay đổi bất thường: Chuyển đổi đột ngột giữa nhìn rõ và mờ có thể là dấu hiệu của bệnh tiểu đường hoặc bệnh lý khác.

8. Đột ngột nhìn đôi: Có thể là dấu hiệu xuất huyết, khối u hoặc phù nề, cần được thăm khám ngay.

9. Nhìn thấy tia sáng đột ngột: Là triệu chứng của bong võng mạc, một tình trạng cấp cứu nhãn khoa.

10. Khô mắt mạn tính: Có thể là dấu hiệu của hội chứng Sjögren, làm tăng nguy cơ nhiễm trùng và u lympho.

11. Mắt bị lồi: Có thể là dấu hiệu của bệnh lý mắt do tuyến giáp, đe dọa thị lực và có thể dẫn đến mù lòa.

12. Căng tức trong mắt: Có thể do viêm phía sau mắt như bệnh tuyến giáp, nhiễm trùng hoặc khối u.

Khi gặp bất kỳ dấu hiệu nào kể trên, đặc biệt là những dấu hiệu xuất hiện đột ngột, người bệnh nên đến cơ sở y tế chuyên khoa mắt để được thăm khám kịp thời.',
    'https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?w=600&h=360&fit=crop&auto=format',
    13, 2, 'PUBLISHED', DATEADD(DAY,-4,GETDATE()), DATEADD(DAY,-4,GETDATE())),

(6, N'Dinh dưỡng — yếu tố quan trọng giúp chống lại tình trạng suy giảm thị lực',
    N'dinh-duong-yeu-to-quan-trong-chong-suy-giam-thi-luc',
    N'Theo các bác sĩ chuyên khoa mắt, việc bổ sung đầy đủ dưỡng chất cho mắt mỗi ngày là phương pháp hiệu quả để chống lại tình trạng suy giảm thị lực. Một số dưỡng chất quan trọng cần lưu ý:

- Vitamin A: Tạo sắc tố thị giác giúp nhìn rõ trong điều kiện thiếu sáng; thiếu vitamin A gây quáng gà. Có nhiều trong dầu gan cá, sữa, lòng đỏ trứng, gan, cà rốt, bí đỏ, cà chua.

- Vitamin E: Giúp giảm nguy cơ thoái hóa điểm vàng. Có trong các loại hạt, ngũ cốc, gan bò, lòng đỏ trứng.

- Vitamin C: Hỗ trợ sức khỏe của mắt, có nhiều trong rau xanh tươi và trái cây họ cam quýt.

- Lutein: Giúp phòng ngừa thoái hóa điểm vàng, có nhiều trong rau lá xanh đậm.

- Kẽm: Là khoáng chất thiết yếu cho hoạt động của mắt.

- Anthocyanosides và Oligomeric proanthocyanosides: Có đặc tính chống oxy hóa, tìm thấy trong việt quất đen và hạt nho.

Bên cạnh chế độ dinh dưỡng, các bác sĩ khuyến nghị áp dụng quy tắc "20-20-20": cứ mỗi 20 phút nhìn màn hình, hãy cho mắt nghỉ 20 giây bằng cách nhắm mắt hoặc nhìn ra xa trên 6 mét. Sử dụng kính lọc ánh sáng xanh khi làm việc với máy tính cũng là biện pháp được khuyến khích.',
    'https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=600&h=360&fit=crop&auto=format',
    19, 2, 'PUBLISHED', DATEADD(DAY,-7,GETDATE()), DATEADD(DAY,-8,GETDATE())),

(7, N'Bác sĩ nhãn khoa khuyên bạn nên biết 10 điều này',
    N'bac-si-nhan-khoa-khuyen-ban-nen-biet-10-dieu-nay',
    N'Khám mắt định kỳ là điều cần thiết ngay cả khi không có triệu chứng bất thường, và một chế độ ăn cân bằng cũng góp phần bảo vệ sức khỏe đôi mắt. Dưới đây là 10 điều các bác sĩ nhãn khoa khuyên bạn nên biết:

1. Dùng máy tính nhiều không làm hỏng mắt vĩnh viễn, nhưng gây mỏi mắt và mờ mắt tạm thời. Nên nghỉ mắt sau mỗi 20 phút, nhìn xa 2-5 phút và chớp mắt thường xuyên để giữ ẩm tự nhiên.

2. Đeo kính không làm mắt yếu đi: Kính chất lượng tốt, đúng độ tuổi không gây hại cho mắt như nhiều người vẫn lầm tưởng.

3. Mắt khô vào mùa đông: Thời tiết lạnh làm nước mắt bốc hơi nhanh hơn, gây đỏ và khó chịu. Máy tạo độ ẩm, nước mắt nhân tạo và uống đủ nước sẽ giúp cải thiện.

4. Rủi ro từ mỹ phẩm: Chuốt mascara có thể gây trầy giác mạc, các hạt mỹ phẩm có thể lọt vào dưới mí mắt và gây tổn thương.

5. Hút thuốc gây hại cho thị lực: Hút thuốc thường xuyên làm tăng nguy cơ thoái hóa điểm vàng — nguyên nhân hàng đầu gây mù lòa ở người trưởng thành.

6. Không chỉ có cà rốt: Rau lá xanh đậm như cải bó xôi, cải xoăn có tác dụng phòng ngừa thoái hóa điểm vàng tốt hơn cà rốt.

7. Đọc sách trong ánh sáng yếu: Không gây tổn thương vĩnh viễn cho mắt, chỉ khiến mắt mỏi và đau đầu nhanh hơn. Góc đọc sách quan trọng hơn độ sáng.

8. Mắt đỏ cần được thăm khám: Đôi khi mắt đỏ là dấu hiệu của bệnh lý nghiêm trọng gây nhạy cảm hoặc mất thị lực, không nên chủ quan cho rằng vô hại.

9. Tháo kính áp tròng trước khi ngủ: Ngủ khi đeo kính áp tròng làm tăng nguy cơ nhiễm trùng gấp 10-15 lần, có thể gây đau, đỏ mắt và nhạy cảm ánh sáng.

10. Vệ sinh kính đúng cách: Tránh dùng nước nóng khi rửa kính vì làm giảm tuổi thọ tròng kính; nên dùng nước ấm và khăn sạch thay vì quần áo để tránh bụi bẩn.',
    'https://images.unsplash.com/photo-1516841273335-e39b37888115?w=600&h=360&fit=crop&auto=format',
    10, 1, 'PUBLISHED', DATEADD(DAY,-1,GETDATE()), DATEADD(DAY,-1,GETDATE()));

SET IDENTITY_INSERT blog_posts OFF;
GO

-- ============================================================================
-- 23. verification_tokens (1 token đã dùng, 1 token còn hiệu lực)
-- ============================================================================
SET IDENTITY_INSERT verification_tokens ON;

INSERT INTO verification_tokens (id, user_id, token_hash, type, expires_at, used, created_at)
VALUES
(1, 28, N'd4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5',
    'PASSWORD_RESET', DATEADD(HOUR, 1, DATEADD(DAY,-2,GETDATE())), 1, DATEADD(DAY,-2,GETDATE())),

(2, 29, N'e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6',
    'EMAIL_VERIFY', DATEADD(HOUR, 24, GETDATE()), 0, GETDATE());

SET IDENTITY_INSERT verification_tokens OFF;
GO

-- ============================================================================
-- 24. audit_logs (entity_id là chuỗi)
-- ============================================================================
SET IDENTITY_INSERT audit_logs ON;

INSERT INTO audit_logs
    (id, user_id, action, entity_type, entity_id, old_value, new_value, ip_address, created_at)
VALUES
(1, 1, N'CREATE', N'users', N'31',
    NULL,
    N'{"email":"patient5@gmail.com","role":"PATIENT","status":"ACTIVE","isVirtual":true}',
    N'192.168.1.1',  DATEADD(DAY,-7,GETDATE())),

(2, 29, N'UPDATE', N'appointments', N'9',
    N'{"status":"PENDING"}',
    N'{"status":"CANCELLED","cancel_reason":"Bệnh nhân bận việc đột xuất"}',
    N'192.168.1.10', GETDATE()),

(3, 10, N'UPDATE', N'medical_records', N'1',
    N'{"status":"IN_PROGRESS"}',
    N'{"status":"COMPLETED","locked_by":10}',
    N'192.168.1.20', DATEADD(DAY,-3,GETDATE())),

(4, 11, N'UPDATE', N'prescriptions', N'1',
    N'{"status":"PENDING"}',
    N'{"status":"DISPENSED"}',
    N'192.168.1.30', DATEADD(DAY,-3,GETDATE())),

(5, 1, N'UPDATE', N'system_configs', N'1',
    N'{"config_value":"30"}',
    N'{"config_value":"30"}',
    N'192.168.1.1',  DATEADD(DAY,-1,GETDATE())),

(6, 17, N'DEMO_LOGIN', N'User', N'17',
    NULL, NULL,
    N'127.0.0.1', DATEADD(HOUR,-2,GETDATE()));

SET IDENTITY_INSERT audit_logs OFF;
GO

-- ============================================================================
-- 25. doctor_schedules (ca làm việc vài ngày tới — 4 bác sĩ)
-- ============================================================================
SET IDENTITY_INSERT doctor_schedules ON;

INSERT INTO doctor_schedules
    (id, doctor_id, work_date, slot_start, slot_end, max_slot, booked_slot, status, created_at)
VALUES
(1,  1, CAST(GETDATE() AS DATE),               '07:30', '11:30', 10, 2, 'AVAILABLE', GETDATE()),
(2,  1, CAST(DATEADD(DAY,1,GETDATE()) AS DATE),'07:30', '11:30', 10, 1, 'AVAILABLE', GETDATE()),
(3,  1, CAST(DATEADD(DAY,2,GETDATE()) AS DATE),'13:00', '17:00', 10, 0, 'AVAILABLE', GETDATE()),
(4,  2, CAST(DATEADD(DAY,1,GETDATE()) AS DATE),'07:30', '11:30',  8, 1, 'AVAILABLE', GETDATE()),
(5,  2, CAST(DATEADD(DAY,3,GETDATE()) AS DATE),'13:00', '17:00',  8, 0, 'AVAILABLE', GETDATE()),
(6,  3, CAST(DATEADD(DAY,2,GETDATE()) AS DATE),'07:30', '11:30',  6, 1, 'AVAILABLE', GETDATE()),
(7,  3, CAST(DATEADD(DAY,4,GETDATE()) AS DATE),'13:00', '17:00',  6, 0, 'AVAILABLE', GETDATE()),
(8,  4, CAST(GETDATE() AS DATE),               '13:00', '17:00', 10, 0, 'AVAILABLE', GETDATE()),
(9,  4, CAST(DATEADD(DAY,2,GETDATE()) AS DATE),'07:30', '11:30', 10, 0, 'AVAILABLE', GETDATE());

SET IDENTITY_INSERT doctor_schedules OFF;
GO

-- ============================================================================
-- 26. feedbacks + feedback_participant_ratings (UC-48)
--     feedback_participant_ratings: điểm riêng cho từng người tham gia buổi khám
-- ============================================================================
--     CK_feedbacks_subject: mỗi dòng gắn ĐÚNG 1 trong 2 — appointment_id (khám bác sĩ)
--     HOẶC care_session_id (buổi chăm sóc điều dưỡng). nurse_id = users.id.
SET IDENTITY_INSERT feedbacks ON;

INSERT INTO feedbacks
    (id, patient_id, appointment_id, care_session_id, doctor_id, nurse_id, rating, content, is_anonymous, status, created_at)
VALUES
(1, 1, 1, NULL, 1, NULL, 5,
    N'Bác sĩ rất tận tâm, giải thích rõ ràng. Phòng khám sạch sẽ, nhân viên thân thiện!',
    0, 'APPROVED', DATEADD(DAY,-2,GETDATE())),

(2, 2, 2, NULL, 1, NULL, 4,
    N'Bác sĩ khám kỹ, dặn dò chi tiết. Chờ hơi lâu nhưng chấp nhận được.',
    0, 'APPROVED', DATEADD(DAY,-2,GETDATE())),

(3, 4, 4, NULL, 3, NULL, 5,
    N'Ca phẫu thuật diễn ra thuận lợi, ê-kíp rất chuyên nghiệp. Phục hồi thị lực tốt sau 1 ngày.',
    1, 'PENDING', DATEADD(DAY,-1,GETDATE())),

-- Đánh giá buổi CHĂM SÓC (care_sessions id 2, điều dưỡng Lê Điều Dưỡng = users.id 4)
-- → appointment_id/doctor_id NULL. Backend hiện chỉ ĐỌC được dòng này, chưa tạo được
--   feedback loại này qua API (Feedback.java chưa có field careSession/nurse).
(4, 1, NULL, 2, NULL, 4, 5,
    N'Điều dưỡng nhẹ nhàng, hướng dẫn bài tập tại nhà rất dễ hiểu. Mắt đỡ mỏi hẳn sau buổi massage.',
    0, 'APPROVED', DATEADD(DAY,-7,GETDATE()));

SET IDENTITY_INSERT feedbacks OFF;
GO

SET IDENTITY_INSERT feedback_participant_ratings ON;

INSERT INTO feedback_participant_ratings (id, feedback_id, participant_role, participant_name, rating) VALUES
(1, 1, N'DOCTOR',         N'Thái Khắc Hữu Đức',   5),
(2, 1, N'RECEPTIONIST',   N'Lê Thị Bích Ngân',    5),
(3, 1, N'LAB_TECHNICIAN', N'Trịnh Kỹ Thuật Viên', 4),
(4, 2, N'DOCTOR',         N'Thái Khắc Hữu Đức',   4),
(5, 2, N'RECEPTIONIST',   N'Lê Thị Bích Ngân',    3),
(6, 3, N'DOCTOR',         N'BS. Lê Minh Châu',    5),
(7, 3, N'NURSE',          N'Lê Điều Dưỡng',       5),
(8, 3, N'LAB_TECHNICIAN', N'Trịnh Kỹ Thuật Viên', 5);

SET IDENTITY_INSERT feedback_participant_ratings OFF;
GO

-- ============================================================================
-- 27. staff_room_assignments (phân trực phòng — bảng rooms đã seed ở mục 6b)
-- ============================================================================
-- staff_room_assignments: phân trực standing (is_one_day_override = 0) hiệu lực từ đầu năm —
-- mỗi bác sĩ/điều dưỡng/KTV giữ nguyên phòng cho tới khi Manager đổi.
-- ⚠️ staff_id là id của BẢNG CHUYÊN MÔN theo staff_type (KHÔNG phải users.id):
--    DOCTOR → doctors.id | NURSE → staffs.id | LAB_TECHNICIAN → lab_technicians.id
-- assigned_by = users.id của Manager (2 = Đồng Quản Lý).
INSERT INTO staff_room_assignments (staff_type, staff_id, room_id, effective_from, work_date, is_one_day_override, assigned_by, created_at) VALUES
(N'DOCTOR',         1,  1, '2026-01-01', NULL, 0, 2, GETDATE()), -- Thái Khắc Hữu Đức (doctors.id=1) → Phòng khám tổng quát A
(N'DOCTOR',         2,  2, '2026-01-01', NULL, 0, 2, GETDATE()), -- Trịnh Đình Tuấn   (doctors.id=2) → Phòng khám tổng quát B
(N'DOCTOR',         3,  3, '2026-01-01', NULL, 0, 2, GETDATE()), -- BS. Lê Minh Châu  (doctors.id=3) → Phòng phẫu thuật
(N'DOCTOR',         4,  7, '2026-01-01', NULL, 0, 2, GETDATE()), -- BS. Nguyễn Văn An (doctors.id=4) → Phòng khám tổng quát C
(N'NURSE',          4,  4, '2026-01-01', NULL, 0, 2, GETDATE()), -- Lê Điều Dưỡng     (staffs.id=4)  → Phòng chăm sóc & phục hồi 1
(N'NURSE',          17, 5, '2026-01-01', NULL, 0, 2, GETDATE()), -- Đặng Thị Thanh Thảo (staffs.id=17) → Phòng chăm sóc & phục hồi 2
(N'LAB_TECHNICIAN', 1,  6, '2026-01-01', NULL, 0, 2, GETDATE()); -- Trịnh Kỹ Thuật Viên (lab_technicians.id=1) → Phòng xét nghiệm
GO

-- ============================================================================
-- 28. chat_sessions + chat_messages (MỚI) — khung chat lễ tân ↔ bệnh nhân
--     assigned_to_id = users.id của lễ tân | sender_role: PATIENT | RECEPTIONIST
-- ============================================================================
SET IDENTITY_INSERT chat_sessions ON;

INSERT INTO chat_sessions (id, patient_id, assigned_to_id, status, created_at, updated_at) VALUES
(1, 7, 3, N'ACTIVE', DATEADD(HOUR,-3,GETDATE()), DATEADD(MINUTE,-20,GETDATE())),
(2, 1, 8, N'CLOSED', DATEADD(DAY,-4,GETDATE()),  DATEADD(DAY,-4,GETDATE())),
(3, 8, NULL, N'ACTIVE', DATEADD(MINUTE,-10,GETDATE()), DATEADD(MINUTE,-10,GETDATE()));

SET IDENTITY_INSERT chat_sessions OFF;
GO

SET IDENTITY_INSERT chat_messages ON;

INSERT INTO chat_messages (id, session_id, sender_role, content, created_at) VALUES
(1, 1, N'PATIENT',      N'Chào phòng khám, cho mình hỏi hóa đơn khám hôm trước thanh toán ở đâu ạ?', DATEADD(HOUR,-3,GETDATE())),
(2, 1, N'RECEPTIONIST', N'Chào bạn, bạn có thể thanh toán tại quầy lễ tân hoặc quét mã VietQR trong mục "Hóa đơn của tôi" trên app nhé.', DATEADD(MINUTE,-150,GETDATE())),
(3, 1, N'PATIENT',      N'Mình quét QR thì bao lâu hệ thống ghi nhận ạ?', DATEADD(MINUTE,-25,GETDATE())),
(4, 1, N'RECEPTIONIST', N'Thường dưới 1 phút bạn nhé, hệ thống tự gạch nợ khi nhận được báo có.', DATEADD(MINUTE,-20,GETDATE())),
(5, 2, N'PATIENT',      N'Cho mình hỏi kết quả chụp OCT có rồi chưa ạ?', DATEADD(DAY,-4,GETDATE())),
(6, 2, N'RECEPTIONIST', N'Kết quả đã có và bác sĩ đã duyệt, bạn xem trong mục Hồ sơ bệnh án nhé.', DATEADD(DAY,-4,GETDATE())),
(7, 3, N'PATIENT',      N'Mình muốn đổi lịch buổi chăm sóc mắt chiều nay được không ạ?', DATEADD(MINUTE,-10,GETDATE()));

SET IDENTITY_INSERT chat_messages OFF;
GO

-- ============================================================================
-- 29. XƯỞNG KÍNH (MỚI) — eyeglass_frames / eyeglass_coatings / eyeglass_orders
--     Tổng tiền đơn = giá gọng + giá tròng (lens_types.base_price) + các lớp phủ.
--     dispensed_by → users.id (11 = Thái Dược Sĩ), KHÔNG phải staffs.id.
-- ============================================================================
SET IDENTITY_INSERT eyeglass_frames ON;

-- id 1-10: danh mục chuẩn (gộp từ insert_eyeglass_frames.sql của nhóm)
-- id 11-13: phân khúc học sinh/giá rẻ (gộp từ "Thêm loại kính.sql")
INSERT INTO eyeglass_frames (id, name, brand, material, color, price, stock_quantity, status) VALUES
(1,  N'Gọng kính cận tròn Lily 2026',             N'Lily Eyewear',    N'Nhựa TR90',        N'Đen trong (Black Clear)',      250000,  50, 'ACTIVE'),
(2,  N'Gọng kính chữ nhật nam tính RB-RX5228',    N'Ray-Ban',         N'Nhựa Acetate',     N'Đồi mồi (Tortoiseshell)',     3500000,  15, 'ACTIVE'),
(3,  N'Gọng kính khoan không viền Titan',         N'Charmant',        N'Titanium',         N'Bạc (Silver)',                4200000,  10, 'ACTIVE'),
(4,  N'Gọng kính mắt mèo thời trang South Side',  N'Gentle Monster',  N'Nhựa Acetate',     N'Đen (Black)',                 4500000,   8, 'ACTIVE'),
(5,  N'Gọng kính nửa viền kim loại GM-20',        N'Parim',           N'Thép không gỉ',    N'Vàng hồng (Rose Gold)',        850000,  25, 'ACTIVE'),
(6,  N'Gọng kính đa giác Unisex TR-90',           N'Seeson',          N'Nhựa TR90',        N'Trong suốt (Transparent)',     480000,  30, 'ACTIVE'),
(7,  N'Gọng kính vuông cổ điển TF-5523',          N'Tom Ford',        N'Nhựa Acetate',     N'Nâu Havana (Havana)',         6500000,   5, 'ACTIVE'),
(8,  N'Gọng kính trẻ em siêu dẻo Kid-Safe',       N'Bolon',           N'Nhựa dẻo Silicone',N'Xanh dương (Blue)',            450000,  40, 'ACTIVE'),
(9,  N'Gọng kính thể thao ôm mặt Crosslink',      N'Oakley',          N'O Matter',         N'Đen nhám (Matte Black)',      2800000,  12, 'ACTIVE'),
(10, N'Gọng titanium siêu mảnh tròn',             N'Exfash',          N'Titanium',         N'Vàng (Gold)',                 1200000,  20, 'ACTIVE'),
(11, N'Gọng nhựa dẻo học sinh',                   N'No Brand',        N'Nhựa',             N'Đen',                          120000, 100, 'ACTIVE'),
(12, N'Gọng tròn Hàn Quốc',                       N'No Brand',        N'Kim loại',         N'Trắng Bạc',                    150000,  80, 'ACTIVE'),
(13, N'Gọng vuông cơ bản',                        N'Local Brand',     N'Nhựa TR90',        N'Xanh Đen',                     180000, 150, 'ACTIVE');

SET IDENTITY_INSERT eyeglass_frames OFF;
GO

-- Gộp từ insert_eyeglass_coatings.sql của nhóm (8 lớp phủ, thay bộ 4 lớp cũ).
SET IDENTITY_INSERT eyeglass_coatings ON;

INSERT INTO eyeglass_coatings (id, name, description, price) VALUES
(1, N'Lớp phủ chống trầy xước (Anti-Scratch)',            N'Tăng độ cứng cho bề mặt tròng kính, hạn chế tối đa các vết xước dăm trong quá trình sinh hoạt và lau chùi.', 100000),
(2, N'Lớp phủ chống phản quang (Anti-Reflective/AR)',     N'Loại bỏ ánh sáng phản chiếu và bóng lóa trên mặt kính, cho hình ảnh truyền qua sắc nét, sáng rõ hơn và tăng tính thẩm mỹ.', 150000),
(3, N'Lớp phủ chống tia cực tím (100% UV Protection)',    N'Ngăn chặn tuyệt đối tia UV400 có hại từ ánh nắng mặt trời, bảo vệ giác mạc và võng mạc khỏi các bệnh lý nguy hiểm.', 120000),
(4, N'Lớp phủ chống bám nước (Hydrophobic)',              N'Tạo hiệu ứng lá sen trên mặt kính giúp nước mưa trôi đi nhanh chóng, không đọng thành giọt gây cản trở tầm nhìn khi đi mưa.', 180000),
(5, N'Lớp phủ chống bám vân tay, dầu mỡ (Oleophobic)',    N'Giúp bề mặt tròng kính trơn láng, hạn chế tối đa việc bám dính mồ hôi, vân tay và rất dễ dàng lau chùi.', 150000),
(6, N'Lớp phủ chống tĩnh điện (Anti-Static)',             N'Khử tĩnh điện trên bề mặt kính (thường sinh ra do ma sát khi lau), giúp tròng kính không bị hút các hạt bụi nhỏ trong không khí.', 100000),
(7, N'Lớp phủ chống đọng sương (Anti-Fog)',               N'Ngăn chặn hiện tượng tròng kính bị mờ đục do hơi thở khi đeo khẩu trang, ăn đồ nóng hoặc khi thay đổi nhiệt độ đột ngột.', 200000),
(8, N'Lớp phủ lọc ánh sáng xanh (Blue Control Coating)',  N'Bề mặt kính phản xạ lại phần lớn ánh sáng xanh tím có hại từ màn hình thiết bị điện tử, giúp mắt giảm căng thẳng và mỏi mệt.', 250000);

SET IDENTITY_INSERT eyeglass_coatings OFF;
GO

SET IDENTITY_INSERT eyeglass_orders ON;

INSERT INTO eyeglass_orders
    (id, patient_id, prescription_id, frame_id, status, total_amount, dispensed_by, dispensed_at, created_at)
VALUES
-- Đơn 1 (đơn kính MR1, BN1): tròng Đơn tròng 300.000 + gọng Lily 250.000
--                            + AR 150.000 + UV 120.000 = 820.000
(1, 1, 1, 1, 'DISPENSED',     820000, 11, DATEADD(DAY,-2,GETDATE()), DATEADD(DAY,-3,GETDATE())),

-- Đơn 2 (đơn kính MR3, BN3): tròng Blue Control 650.000 + gọng Parim GM-20 850.000
--                            + AR 150.000 = 1.650.000
(2, 3, 2, 5, 'IN_PRODUCTION', 1650000, NULL, NULL, DATEADD(DAY,-3,GETDATE()));

SET IDENTITY_INSERT eyeglass_orders OFF;
GO

-- coating 2 = Chống phản quang (AR) | 3 = Chống tia cực tím (UV)
INSERT INTO eyeglass_order_coatings (order_id, coating_id) VALUES
(1, 2), (1, 3),
(2, 2);
GO

-- ============================================================================
-- 30. payroll_periods + payroll_items (MỚI, UC-54)
--     Kỳ trước = APPROVED (đã duyệt & khóa), kỳ hiện tại = DRAFT (đang soạn).
--     payroll_items.staff_type: DOCTOR → doctors.id | STAFF → staffs.id
--     Dòng lương sinh bằng INSERT…SELECT nên luôn khớp danh sách nhân sự ở trên.
--     approved_by = users.id (2 = Đồng Quản Lý).
-- ============================================================================
SET IDENTITY_INSERT payroll_periods ON;

INSERT INTO payroll_periods (id, period_year, period_month, status, approved_by, approved_at, created_at) VALUES
(1, DATEPART(YEAR, DATEADD(MONTH,-1,GETDATE())), DATEPART(MONTH, DATEADD(MONTH,-1,GETDATE())),
    'APPROVED', 2, DATEADD(DAY,-20,GETDATE()), DATEADD(MONTH,-1,GETDATE())),
(2, DATEPART(YEAR, GETDATE()), DATEPART(MONTH, GETDATE()),
    'DRAFT', NULL, NULL, GETDATE());

SET IDENTITY_INSERT payroll_periods OFF;
GO

-- Kỳ 1 (APPROVED, locked = 1): bác sĩ hưởng thưởng 150.000đ/lượt khám hoàn thành.
INSERT INTO payroll_items
    (payroll_period_id, staff_type, staff_ref_id, staff_name, role,
     base_salary, activity_count, performance_bonus, deduction, net_pay, note, locked)
SELECT 1, 'DOCTOR', d.id, d.full_name, d.specialty,
       25000000,
       cnt.completed,
       150000 * cnt.completed,
       0,
       25000000 + 150000 * cnt.completed,
       NULL, 1
FROM doctors d
CROSS APPLY (SELECT COUNT(*) AS completed FROM appointments a
             WHERE a.doctor_id = d.id AND a.status = 'COMPLETED') cnt
WHERE d.status = 'ACTIVE';

INSERT INTO payroll_items
    (payroll_period_id, staff_type, staff_ref_id, staff_name, role,
     base_salary, activity_count, performance_bonus, deduction, net_pay, note, locked)
SELECT 1, 'STAFF', s.id, s.full_name, s.position,
       12000000, 0, 0, 0, 12000000, NULL, 1
FROM staffs s
WHERE s.status = 'ACTIVE';
GO

-- Kỳ 2 (DRAFT, locked = 0): Quản lý còn sửa được thưởng/khấu trừ.
INSERT INTO payroll_items
    (payroll_period_id, staff_type, staff_ref_id, staff_name, role,
     base_salary, activity_count, performance_bonus, deduction, net_pay, note, locked)
SELECT 2, 'DOCTOR', d.id, d.full_name, d.specialty,
       25000000, 0, 0, 0, 25000000, N'Kỳ lương đang soạn — chờ chốt số liệu cuối tháng.', 0
FROM doctors d
WHERE d.status = 'ACTIVE';

INSERT INTO payroll_items
    (payroll_period_id, staff_type, staff_ref_id, staff_name, role,
     base_salary, activity_count, performance_bonus, deduction, net_pay, note, locked)
SELECT 2, 'STAFF', s.id, s.full_name, s.position,
       12000000, 0, 0, 0, 12000000, N'Kỳ lương đang soạn — chờ chốt số liệu cuối tháng.', 0
FROM staffs s
WHERE s.status = 'ACTIVE';
GO

-- ============================================================================
-- 31. DEMO THANH TOÁN — Bệnh nhân "Ngô Bệnh Nhân" (patients.id = 7)
--     + 4 lịch hẹn ĐÃ KHÁM XONG nhưng CHƯA có hóa đơn.
--     Phục vụ demo luồng lễ tân tạo hóa đơn / VietQR / webhook (UC-22):
--     mở tab "Tạo hóa đơn" → hệ thống tự đổ dịch vụ khám + xét nghiệm + thuốc đã kê.
--     Đăng nhập bệnh nhân: trangthangtuong@gmail.com / Password@123
-- ============================================================================

-- 31.1 appointments — 3 lịch đã khám xong (COMPLETED), CHƯA có hóa đơn.
SET IDENTITY_INSERT appointments ON;
DECLARE @dm5 DATETIME2 = CAST(CAST(DATEADD(DAY,-5,GETDATE()) AS DATE) AS DATETIME2);
DECLARE @dm4 DATETIME2 = CAST(CAST(DATEADD(DAY,-4,GETDATE()) AS DATE) AS DATETIME2);
DECLARE @dm1 DATETIME2 = CAST(CAST(DATEADD(DAY,-1,GETDATE()) AS DATE) AS DATETIME2);
INSERT INTO appointments
    (id, patient_id, doctor_id, service_id, room_id, appointment_time, time_slot, type, status,
     notes, queue_number, check_in_time, check_in_by, booked_by,
     cancel_reason, cancelled_by, cancelled_at, created_at)
VALUES
(10, 7, 1, 9,  1, DATEADD(MINUTE, 8*60,  @dm5), N'08:00 - 08:30', 'ONLINE',  'COMPLETED',
    N'Khám mắt định kỳ + chụp OCT',  1, DATEADD(MINUTE, 7*60+55, @dm5), 3, 9, NULL, NULL, NULL, DATEADD(DAY,-6,GETDATE())),
(11, 7, 2, 11, 2, DATEADD(MINUTE, 9*60,  @dm4), N'09:00 - 09:30', 'ONLINE',  'COMPLETED',
    N'Đo khúc xạ, kê thuốc nhỏ mắt', 2, DATEADD(MINUTE, 8*60+55, @dm4), 3, 9, NULL, NULL, NULL, DATEADD(DAY,-5,GETDATE())),
(12, 7, 1, 9,  1, DATEADD(MINUTE, 10*60, @dm1), N'10:00 - 10:30', 'WALK_IN', 'COMPLETED',
    N'Tái khám, soi đáy mắt',        3, DATEADD(MINUTE, 9*60+55, @dm1), 8, 9, NULL, NULL, NULL, DATEADD(DAY,-2,GETDATE()));
SET IDENTITY_INSERT appointments OFF;
GO

-- 31.2 Lịch hẹn ĐÃ KHÁM, có đơn thuốc, CHƯA có hóa đơn — dùng để thử tính năng
--      mở modal "Thu phí" → hệ thống tự đổ dịch vụ khám + thuốc bác sĩ đã kê (UC-27).
SET IDENTITY_INSERT appointments ON;
INSERT INTO appointments
    (id, patient_id, doctor_id, service_id, room_id, appointment_time, time_slot, type, status,
     notes, queue_number, check_in_time, check_in_by, booked_by,
     cancel_reason, cancelled_by, cancelled_at, created_at)
VALUES
(13, 7, 1, 9, 1,
    DATEADD(MINUTE, 11*60, CAST(CAST(DATEADD(DAY,-1,GETDATE()) AS DATE) AS DATETIME2)),
    N'11:00 - 11:30', 'WALK_IN', 'COMPLETED',
    N'Viêm kết mạc, bác sĩ đã kê thuốc — CHƯA thu phí (demo auto-đổ khoản phí)',
    4, DATEADD(MINUTE, 10*60+55, CAST(CAST(DATEADD(DAY,-1,GETDATE()) AS DATE) AS DATETIME2)),
    3, 9, NULL, NULL, NULL, DATEADD(DAY,-1,GETDATE()));
SET IDENTITY_INSERT appointments OFF;
GO

SET IDENTITY_INSERT medical_records ON;
INSERT INTO medical_records
    (id, appointment_id, patient_id, doctor_id, chief_complaint, symptoms, diagnosis,
     treatment_plan, total_amount, locked_at, locked_by, status, created_at)
VALUES
(5, 13, 7, 1,
    N'Mắt đỏ, cộm, chảy nước mắt',
    N'Kết mạc cương tụ nhẹ hai mắt',
    N'Viêm kết mạc cấp',
    N'Nhỏ kháng sinh + nước mắt nhân tạo 7 ngày',
    NULL, DATEADD(DAY,-1,GETDATE()), 10, 'COMPLETED', DATEADD(DAY,-1,GETDATE()));
SET IDENTITY_INSERT medical_records OFF;
GO

SET IDENTITY_INSERT prescriptions ON;
INSERT INTO prescriptions (id, medical_record_id, doctor_id, patient_id, status, notes, created_at)
VALUES
(2, 5, 1, 7, 'DISPENSED',
    N'Kháng sinh sáng-tối, nước mắt nhân tạo khi khô mắt, kháng sinh dự phòng buổi tối.',
    DATEADD(DAY,-1,GETDATE()));
SET IDENTITY_INSERT prescriptions OFF;
GO

SET IDENTITY_INSERT prescription_items ON;
INSERT INTO prescription_items
    (id, prescription_id, medicine_id, quantity, dosage, frequency, duration, instructions, unit_price)
VALUES
(3, 2, 1, 2, N'1 giọt/mắt', N'Sáng và tối',       7,  N'Nhỏ sau khi rửa mặt', 45000),  -- Tobramycin x2
(4, 2, 3, 1, N'1 giọt/mắt', N'Khi khô mắt',       30, NULL,                   85000),  -- Hylo-Comod x1
(5, 2, 6, 1, N'1 giọt/mắt', N'Tối trước khi ngủ', 7,  NULL,                   42000);  -- Ciprofloxacin x1
SET IDENTITY_INSERT prescription_items OFF;
GO

-- 31.3 Bệnh án + đơn thuốc + lab order (gắn dịch vụ xét nghiệm) cho 3 lịch hẹn còn lại
--      (10, 11, 12) để cả 4 lịch demo đều tự đổ: dịch vụ khám + xét nghiệm + thuốc.
SET IDENTITY_INSERT medical_records ON;
INSERT INTO medical_records (id, appointment_id, patient_id, doctor_id, chief_complaint, diagnosis, status, created_at) VALUES
(6, 10, 7, 1, N'Khám định kỳ', N'Theo dõi',  'COMPLETED', DATEADD(DAY,-6,GETDATE())),
(7, 11, 7, 2, N'Đo khúc xạ',   N'Cận thị',   'COMPLETED', DATEADD(DAY,-5,GETDATE())),
(8, 12, 7, 1, N'Tái khám',     N'Ổn định',   'COMPLETED', DATEADD(DAY,-2,GETDATE()));
SET IDENTITY_INSERT medical_records OFF;
GO

SET IDENTITY_INSERT prescriptions ON;
INSERT INTO prescriptions (id, medical_record_id, doctor_id, patient_id, status, created_at) VALUES
(3, 6, 1, 7, 'DISPENSED', DATEADD(DAY,-6,GETDATE())),
(4, 7, 2, 7, 'DISPENSED', DATEADD(DAY,-5,GETDATE())),
(5, 8, 1, 7, 'DISPENSED', DATEADD(DAY,-2,GETDATE()));
SET IDENTITY_INSERT prescriptions OFF;
GO

SET IDENTITY_INSERT prescription_items ON;
INSERT INTO prescription_items (id, prescription_id, medicine_id, quantity, dosage, frequency, duration, unit_price) VALUES
(6, 3, 1, 2, N'1 giọt/mắt', N'Sáng và tối', 7,  45000),   -- Tobramycin x2 (appt 10)
(7, 4, 3, 1, N'1 giọt/mắt', N'Khi khô mắt', 30, 85000),   -- Hylo-Comod x1 (appt 11)
(8, 5, 2, 1, N'1 giọt/mắt', N'Tối',         7,  38000);   -- Dexamethasone x1 (appt 12)
SET IDENTITY_INSERT prescription_items OFF;
GO

-- Lab order gắn dịch vụ xét nghiệm (chụp/đo/soi) — service_id trỏ tới dịch vụ CLINICAL có giá.
-- getSuggestedItems đọc lab_orders.service_id để tự đổ khoản xét nghiệm vào hóa đơn (UC-22).
SET IDENTITY_INSERT lab_orders ON;
INSERT INTO lab_orders (id, medical_record_id, ordered_by, assigned_to, service_id, priority, status, created_at) VALUES
(4, 6, 1, 1, 14, 'PRIMARY', 'APPROVED', DATEADD(DAY,-6,GETDATE())),  -- appt 10 → Chụp OCT
(5, 7, 2, 1, 12, 'PRIMARY', 'APPROVED', DATEADD(DAY,-5,GETDATE())),  -- appt 11 → Đo nhãn áp
(6, 8, 1, 2, 13, 'PRIMARY', 'APPROVED', DATEADD(DAY,-2,GETDATE())),  -- appt 12 → Soi đáy mắt
(7, 5, 1, 1, 14, 'PRIMARY', 'APPROVED', DATEADD(DAY,-1,GETDATE()));  -- appt 13 → Chụp OCT
SET IDENTITY_INSERT lab_orders OFF;
GO

-- ############################################################################
-- 32. (TÙY CHỌN) DỮ LIỆU TEST KHỐI LƯỢNG LỚN
--     Gộp từ file ecms_test_data_extra.sql cũ (file đó đã bị xoá).
--
--     Thêm 25 bệnh nhân vãng lai (PATX01..PATX25, không có tài khoản đăng nhập)
--     và lịch hẹn dày đặc: 4 bác sĩ × 5 bệnh nhân/ngày × 36 ngày (7 ngày trước →
--     hôm nay → 28 ngày tới) = 720 lịch, đủ trạng thái COMPLETED/CANCELLED
--     (quá khứ), CONFIRMED (hôm nay & tương lai), PENDING (rải rác).
--     Dùng để test giao diện bác sĩ / hàng đợi / báo cáo với dữ liệu thật sự nhiều.
--
--     ⚠️ KHÔNG bắt buộc cho demo cơ bản — muốn DB gọn thì XOÁ hoặc COMMENT
--        toàn bộ mục 32 này, các mục 1-31 vẫn chạy độc lập bình thường.
--     Cả mục này an toàn khi chạy lại nhiều lần (tự kiểm tra đã có dữ liệu chưa).
-- ############################################################################

-- 32.1 — 25 bệnh nhân test, đủ độ tuổi/lý do khám (trẻ em, thanh niên, trung niên,
--        người già), không có tài khoản (hồ sơ do lễ tân tạo / walk-in).
IF NOT EXISTS (SELECT 1 FROM patients WHERE patient_code = N'PATX01')
BEGIN
    INSERT INTO patients
        (patient_code, full_name, date_of_birth, gender, phone, email, address,
         cccd, blood_type, allergy_notes, emergency_contact_name, emergency_contact_phone, status, created_at)
    VALUES
    (N'PATX01', N'Nguyễn Thị Thu',   '1968-02-14', 'FEMALE', N'0914000001', NULL, N'21 Lê Lợi, Q1, TP.HCM',            NULL, 'A',  N'Cao huyết áp',                 N'Nguyễn Văn Hùng',  N'0914100001', 'ACTIVE', GETDATE()),
    (N'PATX02', N'Trần Văn Hải',     '1955-11-02', 'MALE',   N'0914000002', NULL, N'45 Nguyễn Trãi, Q5, TP.HCM',       NULL, 'O',  N'Tiểu đường type 2',            N'Trần Thị Lan',     N'0914100002', 'ACTIVE', GETDATE()),
    (N'PATX03', N'Phạm Thị Nga',     '1972-06-19', 'FEMALE', N'0914000003', NULL, N'12 Điện Biên Phủ, Q.BT, TP.HCM',   NULL, 'B',  NULL,                            N'Phạm Văn Đông',    N'0914100003', 'ACTIVE', GETDATE()),
    (N'PATX04', N'Lê Văn Tâm',       '1999-09-09', 'MALE',   N'0914000004', NULL, N'8 Cách Mạng Tháng 8, Q10, TP.HCM', NULL, 'AB', NULL,                            N'Lê Thị Hồng',      N'0914100004', 'ACTIVE', GETDATE()),
    (N'PATX05', N'Hoàng Thị Mai',    '2010-03-21', 'FEMALE', N'0914000005', NULL, N'33 Trường Chinh, Q.TB, TP.HCM',    NULL, 'O',  N'Dị ứng thời tiết',             N'Hoàng Văn Sơn',    N'0914100005', 'ACTIVE', GETDATE()),
    (N'PATX06', N'Vũ Văn Long',      '2015-07-30', 'MALE',   N'0914000006', NULL, N'19 Hoàng Văn Thụ, Q.PN, TP.HCM',   NULL, 'A',  NULL,                            N'Vũ Thị Hoa',       N'0914100006', 'ACTIVE', GETDATE()),
    (N'PATX07', N'Đặng Thị Hương',   '1988-01-11', 'FEMALE', N'0914000007', NULL, N'7 Nguyễn Đình Chiểu, Q3, TP.HCM',  NULL, 'B',  NULL,                            N'Đặng Văn Tùng',    N'0914100007', 'ACTIVE', GETDATE()),
    (N'PATX08', N'Bùi Văn Nam',      '1993-12-25', 'MALE',   N'0914000008', NULL, N'26 Lý Chính Thắng, Q3, TP.HCM',    NULL, 'O',  NULL,                            N'Bùi Thị Thu',      N'0914100008', 'ACTIVE', GETDATE()),
    (N'PATX09', N'Đỗ Thị Yến',       '1965-05-05', 'FEMALE', N'0914000009', NULL, N'14 Sư Vạn Hạnh, Q10, TP.HCM',      NULL, 'A',  N'Glocom góc mở đang theo dõi',  N'Đỗ Văn Kiên',      N'0914100009', 'ACTIVE', GETDATE()),
    (N'PATX10', N'Ngô Văn Đức',      '1980-08-08', 'MALE',   N'0914000010', NULL, N'50 Ba Tháng Hai, Q10, TP.HCM',     NULL, 'AB', NULL,                            N'Ngô Thị Hạnh',     N'0914100010', 'ACTIVE', GETDATE()),
    (N'PATX11', N'Dương Thị Kim',    '2003-04-17', 'FEMALE', N'0914000011', NULL, N'9 Nguyễn Tri Phương, Q5, TP.HCM',  NULL, 'O',  NULL,                            N'Dương Văn Phong',  N'0914100011', 'ACTIVE', GETDATE()),
    (N'PATX12', N'Trịnh Văn Sơn',    '1976-10-23', 'MALE',   N'0914000012', NULL, N'17 Lê Hồng Phong, Q10, TP.HCM',    NULL, 'B',  N'Đục thủy tinh thể 2 mắt',      N'Trịnh Thị Nhung',  N'0914100012', 'ACTIVE', GETDATE()),
    (N'PATX13', N'Lý Thị Ngọc',      '1991-02-02', 'FEMALE', N'0914000013', NULL, N'31 Cao Thắng, Q3, TP.HCM',         NULL, 'A',  N'Khô mắt mạn tính',             N'Lý Văn Bảo',       N'0914100013', 'ACTIVE', GETDATE()),
    (N'PATX14', N'Phan Văn Khoa',    '1960-06-06', 'MALE',   N'0914000014', NULL, N'6 Kỳ Đồng, Q3, TP.HCM',            NULL, 'O',  N'Tiểu đường, theo dõi đáy mắt', N'Phan Thị Loan',    N'0914100014', 'ACTIVE', GETDATE()),
    (N'PATX15', N'Huỳnh Thị Loan',   '1985-03-15', 'FEMALE', N'0914000015', NULL, N'40 Nam Kỳ Khởi Nghĩa, Q1, TP.HCM', NULL, 'AB', N'Dị ứng phấn hoa',              N'Huỳnh Văn Tài',    N'0914100015', 'ACTIVE', GETDATE()),
    (N'PATX16', N'Đinh Văn Phúc',    '2008-11-11', 'MALE',   N'0914000016', NULL, N'23 Nguyễn Thị Thập, Q7, TP.HCM',   NULL, 'B',  NULL,                            N'Đinh Thị Hà',      N'0914100016', 'ACTIVE', GETDATE()),
    (N'PATX17', N'Mai Thị Thảo',     '1997-07-07', 'FEMALE', N'0914000017', NULL, N'15 Huỳnh Văn Bánh, Q.PN, TP.HCM',  NULL, 'O',  NULL,                            N'Mai Văn Dũng',     N'0914100017', 'ACTIVE', GETDATE()),
    (N'PATX18', N'Chu Văn Hòa',      '1970-09-19', 'MALE',   N'0914000018', NULL, N'11 Phan Đăng Lưu, Q.PN, TP.HCM',   NULL, 'A',  NULL,                            N'Chu Thị Xuân',     N'0914100018', 'ACTIVE', GETDATE()),
    (N'PATX19', N'Tạ Thị Xuân',      '1963-12-12', 'FEMALE', N'0914000019', NULL, N'28 Trần Quốc Thảo, Q3, TP.HCM',    NULL, 'AB', N'Đã mổ Phaco mắt phải',         N'Tạ Văn Hùng',      N'0914100019', 'ACTIVE', GETDATE()),
    (N'PATX20', N'Lâm Văn Quang',    '2001-05-25', 'MALE',   N'0914000020', NULL, N'5 Nguyễn Văn Trỗi, Q.PN, TP.HCM',  NULL, 'B',  NULL,                            N'Lâm Thị Ngọc',     N'0914100020', 'ACTIVE', GETDATE()),
    (N'PATX21', N'Vương Thị Hằng',   '1994-08-18', 'FEMALE', N'0914000021', NULL, N'37 Lê Văn Sỹ, Q3, TP.HCM',         NULL, 'O',  NULL,                            N'Vương Văn Long',   N'0914100021', 'ACTIVE', GETDATE()),
    (N'PATX22', N'Cao Văn Bình',     '1958-01-30', 'MALE',   N'0914000022', NULL, N'20 Trần Não, Q2, TP.HCM',          NULL, 'A',  N'Nghi glocom, tăng nhãn áp',    N'Cao Thị Hương',    N'0914100022', 'ACTIVE', GETDATE()),
    (N'PATX23', N'Đào Thị Vy',       '2012-10-10', 'FEMALE', N'0914000023', NULL, N'42 Quang Trung, Q.GV, TP.HCM',     NULL, 'B',  NULL,                            N'Đào Văn Kiên',     N'0914100023', 'ACTIVE', GETDATE()),
    (N'PATX24', N'Trương Văn Đạt',   '1983-04-04', 'MALE',   N'0914000024', NULL, N'16 Phạm Văn Đồng, Q.TĐ, TP.HCM',   NULL, 'AB', NULL,                            N'Trương Thị Mai',   N'0914100024', 'ACTIVE', GETDATE()),
    (N'PATX25', N'Nguyễn Thị Bích',  '1990-11-20', 'FEMALE', N'0914000025', NULL, N'29 Ung Văn Khiêm, Q.BT, TP.HCM',   NULL, 'O',  N'Cận thị nặng -8 độ',           N'Nguyễn Văn Tân',   N'0914100025', 'ACTIVE', GETDATE());

    PRINT N'✅ [Mục 32] Đã thêm 25 bệnh nhân test (PATX01..PATX25).';
END
ELSE
BEGIN
    PRINT N'⏭️  [Mục 32] Bộ bệnh nhân test (PATX01..25) đã tồn tại — bỏ qua.';
END
GO

-- 32.2 — Lịch hẹn: 4 bác sĩ × 5 bệnh nhân/ngày × 36 ngày.
--        Trạng thái tự suy theo ngày: quá khứ phần lớn COMPLETED (một số CANCELLED),
--        hôm nay tự COMPLETED/CONFIRMED theo giờ chạy script, tương lai CONFIRMED
--        (rải rác PENDING). check_in_by/cancelled_by = 3 (Lê Thị Bích Ngân — lễ tân).
IF NOT EXISTS (SELECT 1 FROM appointments a JOIN patients p ON a.patient_id = p.id WHERE p.patient_code LIKE N'PATX%')
BEGIN
    DECLARE @NewPatients TABLE (rn INT IDENTITY(1,1) PRIMARY KEY, patient_id BIGINT);
    INSERT INTO @NewPatients (patient_id)
    SELECT id FROM patients WHERE patient_code LIKE N'PATX%' ORDER BY patient_code;

    DECLARE @PatientCount INT = (SELECT COUNT(*) FROM @NewPatients);

    ;WITH Days AS (
        SELECT 0 AS n
        UNION ALL SELECT n + 1 FROM Days WHERE n < 35
    ),
    Doctors(doctor_id) AS (
        SELECT v.doctor_id FROM (VALUES (1),(2),(3),(4)) v(doctor_id)
    ),
    Slots(slot_idx, minutes_from_midnight) AS (
        SELECT v.slot_idx, v.minutes_from_midnight FROM (VALUES (1,450),(2,510),(3,570),(4,810),(5,870)) v(slot_idx, minutes_from_midnight)
    ),
    Reasons(doctor_id, idx, complaint, service_id) AS (
        SELECT v.doctor_id, v.idx, v.complaint, v.service_id FROM (VALUES
            -- BS 1 — Thái Khắc Hữu Đức (khoa mắt tổng quát)
            (1,1,N'Mắt đỏ, ngứa và chảy nước mắt 2 ngày nay',9),
            (1,2,N'Cộm xốn như có dị vật trong mắt',9),
            (1,3,N'Khô mắt, mỏi mắt do làm việc máy tính nhiều',9),
            (1,4,N'Ngứa mắt, nghi dị ứng phấn hoa',9),
            (1,5,N'Đau nhức hốc mắt kèm nhìn mờ nhẹ',12),
            (1,6,N'Chảy ghèn vàng buổi sáng, mí mắt sưng',9),
            (1,7,N'Trẻ em kiểm tra mắt định kỳ theo yêu cầu trường học',10),
            (1,8,N'Mắt mỏi, nhìn xa hay bị nhòe cuối ngày',11),
            (1,9,N'Ngứa mí, nghi viêm bờ mi',9),
            (1,10,N'Tái khám theo dõi sau đợt viêm kết mạc',9),
            -- BS 2 — Trịnh Đình Tuấn (khúc xạ & kính áp tròng)
            (2,1,N'Nhìn xa mờ, nghi tăng độ cận',11),
            (2,2,N'Học sinh khám mắt định kỳ đầu năm học, đo độ kính',11),
            (2,3,N'Muốn chuyển sang đeo kính áp tròng, cần đo giác mạc',6),
            (2,4,N'Nhìn gần mờ, nghi lão thị mới xuất hiện',11),
            (2,5,N'Song thị nhẹ khi nhìn xa, cần đo khúc xạ',10),
            (2,6,N'Nhức đầu khi đọc sách lâu, nghi loạn thị',11),
            (2,7,N'Tái khám chỉnh độ kính sau 6 tháng',11),
            (2,8,N'Chóng mặt, mờ mắt khi lái xe ban đêm',10),
            (2,9,N'Muốn kiểm tra lại độ cận trước khi mổ Lasik',6),
            (2,10,N'Mắt lệch nhẹ, phụ huynh đưa bé đi khám khúc xạ',11),
            -- BS 3 — BS. Lê Minh Châu (phẫu thuật mắt)
            (3,1,N'Nhìn mờ như có màn sương, nghi đục thủy tinh thể',9),
            (3,2,N'Tái khám sau mổ Phaco mắt phải, kiểm tra vết mổ',9),
            (3,3,N'Chói sáng mạnh khi ra nắng, nhìn đôi nhẹ',13),
            (3,4,N'Tư vấn phẫu thuật Lasik cận thị nặng',9),
            (3,5,N'Đau mắt tăng dần kèm đỏ, nghi tăng nhãn áp',12),
            (3,6,N'Khám tiền phẫu chuẩn bị mổ đục thủy tinh thể',7),
            (3,7,N'Nhìn mờ đột ngột 1 bên mắt, cần loại trừ bong võng mạc',13),
            (3,8,N'Tái khám định kỳ theo dõi đáy mắt tiểu đường',13),
            (3,9,N'Sụp mí mắt trái, ảnh hưởng tầm nhìn',9),
            (3,10,N'Chảy nước mắt sống liên tục, nghi tắc lệ đạo',9),
            -- BS 4 — BS. Nguyễn Văn An (khoa mắt tổng quát, tầm soát glocom/võng mạc)
            (4,1,N'Khám sức khỏe mắt định kỳ hằng năm',9),
            (4,2,N'Tầm soát glocom do gia đình có người mắc bệnh',12),
            (4,3,N'Theo dõi võng mạc do đái tháo đường 5 năm',13),
            (4,4,N'Nhìn thấy chấm đen bay lơ lửng trước mắt',13),
            (4,5,N'Mắt mờ dần cả 2 bên trong 3 tháng gần đây',14),
            (4,6,N'Đau đầu vùng trán kèm mờ mắt buổi chiều',12),
            (4,7,N'Kiểm tra thị lực để làm hồ sơ xin việc',10),
            (4,8,N'Mí mắt sụp nhẹ, chảy nước mắt khi ra gió',9),
            (4,9,N'Khám lại sau đợt điều trị viêm màng bồ đào',14),
            (4,10,N'Cảm giác nặng mắt, nhức mỏi khi đọc sách lâu',11)
        ) v(doctor_id, idx, complaint, service_id)
    ),
    Combo AS (
        SELECT
            d.n - 7 AS day_offset,
            doc.doctor_id,
            s.slot_idx,
            s.minutes_from_midnight,
            ROW_NUMBER() OVER (ORDER BY d.n, doc.doctor_id, s.slot_idx) AS rn_all,
            ROW_NUMBER() OVER (PARTITION BY doc.doctor_id ORDER BY d.n, s.slot_idx) AS rn_doc
        FROM Days d
        CROSS JOIN Doctors doc
        CROSS JOIN Slots s
    ),
    Final AS (
        SELECT
            c.day_offset,
            c.doctor_id,
            c.slot_idx,
            c.rn_all,
            CAST(DATEADD(MINUTE, c.minutes_from_midnight, CAST(CAST(DATEADD(DAY, c.day_offset, GETDATE()) AS DATE) AS DATETIME2)) AS DATETIME2) AS appt_time,
            r.complaint,
            r.service_id,
            np.patient_id
        FROM Combo c
        JOIN Reasons r ON r.doctor_id = c.doctor_id AND r.idx = ((c.rn_doc - 1) % 10) + 1
        JOIN @NewPatients np ON np.rn = ((c.rn_all - 1) % @PatientCount) + 1
    )
    INSERT INTO appointments
        (patient_id, doctor_id, service_id, appointment_time, time_slot, type, status,
         notes, queue_number, check_in_time, check_in_by, booked_by,
         cancel_reason, cancelled_by, cancelled_at, created_at)
    SELECT
        f.patient_id,
        f.doctor_id,
        f.service_id,
        f.appt_time,
        FORMAT(f.appt_time, 'HH:mm') + N' - ' + FORMAT(DATEADD(MINUTE, ISNULL(s.duration_minutes, 30), f.appt_time), 'HH:mm'),
        'WALK_IN',
        CASE
            WHEN f.day_offset < 0 AND f.rn_all % 11 = 0 THEN 'CANCELLED'
            WHEN f.day_offset < 0 THEN 'COMPLETED'
            WHEN f.day_offset = 0 AND f.appt_time < GETDATE() THEN 'COMPLETED'
            WHEN f.day_offset = 0 THEN 'CONFIRMED'
            WHEN f.day_offset > 0 AND f.rn_all % 7 = 0 THEN 'PENDING'
            ELSE 'CONFIRMED'
        END,
        f.complaint,
        CASE WHEN (f.day_offset < 0 AND f.rn_all % 11 <> 0) OR (f.day_offset = 0 AND f.appt_time < GETDATE()) THEN f.slot_idx ELSE NULL END,
        CASE WHEN (f.day_offset < 0 AND f.rn_all % 11 <> 0) OR (f.day_offset = 0 AND f.appt_time < GETDATE()) THEN DATEADD(MINUTE, -5, f.appt_time) ELSE NULL END,
        CASE WHEN (f.day_offset < 0 AND f.rn_all % 11 <> 0) OR (f.day_offset = 0 AND f.appt_time < GETDATE()) THEN 3 ELSE NULL END,
        NULL,
        CASE WHEN f.day_offset < 0 AND f.rn_all % 11 = 0 THEN N'Bệnh nhân gọi điện xin dời lịch, chưa sắp xếp lại' ELSE NULL END,
        CASE WHEN f.day_offset < 0 AND f.rn_all % 11 = 0 THEN 3 ELSE NULL END,
        CASE WHEN f.day_offset < 0 AND f.rn_all % 11 = 0 THEN f.appt_time ELSE NULL END,
        DATEADD(DAY, f.day_offset, GETDATE())
    FROM Final f
    LEFT JOIN services s ON s.id = f.service_id
    OPTION (MAXRECURSION 100);

    PRINT N'✅ [Mục 32] Đã thêm ' + CAST(@@ROWCOUNT AS NVARCHAR(10)) + N' lịch hẹn test (4 bác sĩ × 5 BN/ngày × 36 ngày).';
END
ELSE
BEGIN
    PRINT N'⏭️  [Mục 32] Lịch hẹn test cho bộ bệnh nhân PATX đã tồn tại — bỏ qua.';
END
GO

-- ============================================================================
-- Tóm tắt
-- ============================================================================
PRINT N'';
PRINT N'✅ ECMS Seed Data hoàn tất!';
PRINT N'';
PRINT N'  users                         : 36 (16 email THẬT + 20 email ẢO)';
PRINT N'  ├─ doctors : 4 | lab_technicians : 2 | staffs : 18 | patients : 13 (12 có tk + 1 vãng lai)';
PRINT N'  services                      : 15 (6 CARE + 9 CLINICAL) | categories : 4 | lens_types : 5';
PRINT N'  medicines                     : 6   | discount_campaigns : 12 (2 gốc + 10 theo mùa)';
PRINT N'  appointments                  : 13 (9 gốc + 4 demo COMPLETED chưa có HĐ) | medical_records : 8';
PRINT N'  prescriptions                 : 5 (+8 items) | eyeglass_prescriptions : 2';
PRINT N'  lab_orders                    : 7 | lab_results : 2';
PRINT N'  invoices                      : 4 PAID (+8 details) | payment_transactions : 4';
PRINT N'  subscriptions                 : 3 (+4 care_sessions) | service_registrations : 3';
PRINT N'  notifications                 : 8   | blog_posts : 7 (blog_categories: 4) | audit_logs : 6';
PRINT N'  doctor_schedules              : 9   | feedbacks : 4 (3 khám + 1 chăm sóc, +8 participant_ratings)';
PRINT N'  rooms                         : 8   | staff_room_assignments : 7 | verification_tokens : 2';
PRINT N'  chat_sessions                 : 3 (+7 messages)';
PRINT N'  eyeglass_frames               : 13 | coatings : 8 | orders : 2 | lens_types : 11';
PRINT N'  payroll_periods               : 2 (1 APPROVED + 1 DRAFT) — payroll_items sinh theo nhân sự';
PRINT N'  [Mục 32 - tùy chọn]           : +25 bệnh nhân PATX + 720 lịch hẹn test';
PRINT N'';
PRINT N'  ═══ ĐĂNG NHẬP — MẬT KHẨU CHUNG: Password@123 ═══';
PRINT N'';
PRINT N'  ── EMAIL THẬT (is_virtual = 0) → nhân viên đăng nhập tab "Nhân viên" (có OTP) ──';
PRINT N'  ADMIN          : mh3k42k6@gmail.com                    (Đồng Mạnh Hùng)';
PRINT N'  MANAGER        : bahungcl1999@gmail.com                (Đồng Quản Lý)';
PRINT N'                   nganle1389@gmail.com                  (Lê Quản Lý)';
PRINT N'                   thanggamer2k24@gmail.com              (Ngô Quản Lý)';
PRINT N'                   konamiefootballacc123@gmail.com       (Trịnh Quản Lý)';
PRINT N'  DOCTOR         : thaikhachuuduc@gmail.com              (Thái Khắc Hữu Đức)';
PRINT N'                   trinhdinhtuan23@gmail.com             (Trịnh Đình Tuấn)';
PRINT N'  RECEPTIONIST   : bichngan1826@gmail.com                (Lê Thị Bích Ngân)';
PRINT N'                   ngobachthang2k6@gmail.com             (Ngô Bạch Thắng)';
PRINT N'                   haingapck@gmail.com                   (Thái Quản Lý)';
PRINT N'                   exchange123456788@gmail.com           (Trịnh Quản Lý)';
PRINT N'  PHARMACIST     : thaikhachuuducf01lephuoc@gmail.com    (Thái Dược Sĩ)';
PRINT N'  LAB_TECHNICIAN : tridintstudio23@gmail.com             (Trịnh Kỹ Thuật Viên)';
PRINT N'  NURSE          : andreale389@gmail.com                 (Lê Điều Dưỡng)';
PRINT N'  PATIENT        : dantayf8@gmail.com                    (Lê Bệnh Nhân)';
PRINT N'                   trangthangtuong@gmail.com             (Ngô Bệnh Nhân — demo thanh toán)';
PRINT N'';
PRINT N'  ── EMAIL ẢO (is_virtual = 1) → nhân viên PHẢI đăng nhập tab "Demo" (không OTP) ──';
PRINT N'  ADMIN : admin@ecms.com          | MANAGER      : manager@ecms.com';
PRINT N'  DOCTOR: doctor1@ecms.com,       | RECEPTIONIST : receptionist1@ecms.com,';
PRINT N'          doctor2@ecms.com        |                receptionist2@ecms.com';
PRINT N'  NURSE : nurse1@ecms.com,        | PHARMACIST   : pharmacist@ecms.com';
PRINT N'          nurse2@ecms.com         | LAB_TECH     : labtech@ecms.com';
PRINT N'  PATIENT (cổng bệnh nhân)        : patient1@gmail.com … patient10@gmail.com';
GO
