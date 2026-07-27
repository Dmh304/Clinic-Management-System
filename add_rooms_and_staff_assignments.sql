-- ============================================================
-- Migration: rooms + staff_room_assignments (UC-55, UC-56)
-- SQL Server
-- ============================================================

-- 1) Bảng rooms
CREATE TABLE rooms (
    id              BIGINT IDENTITY(1,1) PRIMARY KEY,
    name            NVARCHAR(100) NOT NULL,
    category        VARCHAR(30) NOT NULL
        CHECK (category IN ('CLINICAL_EXAM','CARE_RECOVERY','DIAGNOSTIC_IMAGING','OPTICAL_WORKSHOP')),
    service_id      BIGINT NULL,               -- optional, FK -> services(id)
    capacity        INT NOT NULL DEFAULT 1,
    status          VARCHAR(20) NOT NULL DEFAULT 'ACTIVE'
        CHECK (status IN ('ACTIVE','INACTIVE')),
    created_at      DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    updated_at      DATETIME2 NULL,

    CONSTRAINT FK_rooms_service FOREIGN KEY (service_id) REFERENCES services(id),
    CONSTRAINT UQ_rooms_name_category UNIQUE (name, category)
);

-- 2) Bảng staff_room_assignments
-- staff_id là polymorphic (doctors.id / staffs.id / lab_technicians.id tuỳ
-- staff_type) — KHÔNG có FK constraint DB cho cột này, validate ở tầng Service
-- (giống invoice_details.ref_id, xem ghi chú trong EYES_CLINIC_PROJECT_INSTRUCTIONS.md).
CREATE TABLE staff_room_assignments (
    id                    BIGINT IDENTITY(1,1) PRIMARY KEY,
    staff_type            VARCHAR(20) NOT NULL
        CHECK (staff_type IN ('DOCTOR','NURSE','LAB_TECHNICIAN')),
    staff_id              BIGINT NOT NULL,
    room_id               BIGINT NOT NULL,
    effective_from        DATE NULL,           -- set khi is_one_day_override = 0
    work_date             DATE NULL,           -- set khi is_one_day_override = 1
    is_one_day_override   BIT NOT NULL DEFAULT 0,
    assigned_by           BIGINT NULL,         -- users.id của Clinic Manager
    created_at            DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),

    CONSTRAINT FK_sra_room FOREIGN KEY (room_id) REFERENCES rooms(id),
    CONSTRAINT FK_sra_assigned_by FOREIGN KEY (assigned_by) REFERENCES users(id)
);

-- Index tăng tốc truy vấn resolve phòng (query nóng nhất trong hệ thống —
-- được gọi mỗi lần đặt lịch/check-in/tạo lab order/care session)
CREATE INDEX IX_sra_lookup
    ON staff_room_assignments (staff_type, staff_id, is_one_day_override, effective_from DESC);

CREATE INDEX IX_sra_override_lookup
    ON staff_room_assignments (staff_type, staff_id, work_date)
    WHERE is_one_day_override = 1;

CREATE INDEX IX_sra_room_date
    ON staff_room_assignments (room_id, work_date);

-- ============================================================
-- Seed data: rooms
-- Dựa theo quy mô đề xuất: 3-4 doctor, 2 nurse, 2 lab technician.
-- Loại bỏ dịch vụ "Phẫu thuật đục thủy tinh thể" (id=8) khỏi phạm vi phòng —
-- category SURGERY không được tạo vì phẫu thuật ngoài scope v0.
-- ============================================================

-- Clinical Exam — mapped 1:1 với "Khám tổng quát mắt" (id=9), 1 phòng/doctor
INSERT INTO rooms (name, category, service_id, capacity, status) VALUES
    (N'Phòng Khám Tổng Hợp A', 'CLINICAL_EXAM', 9, 1, 'ACTIVE'),
    (N'Phòng Khám Tổng Hợp B', 'CLINICAL_EXAM', 9, 1, 'ACTIVE'),
    (N'Phòng Khám Tổng Hợp C', 'CLINICAL_EXAM', 9, 1, 'ACTIVE');
    -- Thêm phòng D nếu tuyển đủ 4 doctor:
    -- (N'Phòng Khám Tổng Hợp D', 'CLINICAL_EXAM', 9, 1, 'ACTIVE');

-- Care & Recovery — KHÔNG map 1 service_id cụ thể vì phục vụ chung mọi gói
-- CARE (id 1-5: Thiền Mắt, Massage Mắt, Chăm Sóc Toàn Diện, Thư Giãn Công
-- Nghệ Cao, Phục Hồi Thị Lực) — 1 phòng/nurse
INSERT INTO rooms (name, category, service_id, capacity, status) VALUES
    (N'Phòng Chăm Sóc & Phục Hồi 1', 'CARE_RECOVERY', NULL, 1, 'ACTIVE'),
    (N'Phòng Chăm Sóc & Phục Hồi 2', 'CARE_RECOVERY', NULL, 1, 'ACTIVE');

-- Diagnostic Imaging — phục vụ chung mọi lab-service (id 10,11,12,13,14:
-- Đo thị lực, Đo khúc xạ, Đo nhãn áp, Soi đáy mắt, Chụp OCT) — 1 lab tech
INSERT INTO rooms (name, category, service_id, capacity, status) VALUES
    (N'Phòng Chẩn Đoán Hình Ảnh', 'DIAGNOSTIC_IMAGING', NULL, 1, 'ACTIVE');

-- Optical Workshop — gia công kính (UC-37), không gắn với bảng services vì
-- nghiệp vụ nằm ở glasses_orders — 1 lab tech
INSERT INTO rooms (name, category, service_id, capacity, status) VALUES
    (N'Xưởng Gia Công Kính', 'OPTICAL_WORKSHOP', NULL, 1, 'ACTIVE');

-- Xét nghiệm sinh hóa máu cơ bản (id=7) và Chụp bản đồ giác mạc/Topo (id=6):
-- nếu 2 dịch vụ này cần phòng/thiết bị riêng biệt (không dùng chung phòng
-- chẩn đoán hình ảnh ở trên), hãy cho mình biết để tách thêm room — hiện
-- seed đang gộp chung vào 'Phòng Chẩn Đoán Hình Ảnh' vì cùng 1-2 lab
-- technician đảm nhiệm theo dữ liệu bạn cung cấp.

select * from rooms
select * from staff_room_assignments

use ecms_db_final;

-- ============================================================
-- 1. Cập nhật nhóm dịch vụ (service_type) cho bảng services
-- ============================================================
-- Nhóm CARE (Gói chăm sóc)
UPDATE services SET service_type = 'CARE' WHERE id IN (1, 2, 3, 4, 5);
-- Nhóm EXAM (Khám lâm sàng)
UPDATE services SET service_type = 'EXAM' WHERE id = 9;
-- Nhóm DIAGNOSTIC (Gộp mọi chỉ định Lab/Imaging và các phép đo vào đây)
UPDATE services SET service_type = 'DIAGNOSTIC' WHERE id IN (6, 7, 10, 11, 12, 13, 14);
-- ============================================================
-- 2. Vô hiệu hoá dịch vụ ngoài Scope
-- ============================================================
-- Vô hiệu hoá dịch vụ "Phẫu thuật" thay vì xoá (Tuân thủ BR-09 No hard-delete)
UPDATE services SET status = 'INACTIVE' WHERE id = 8;
-- ============================================================
-- 3. Cập nhật bảng rooms
-- ============================================================
-- Đổi tên Phòng 6 để phản ánh đúng thực tế (Vừa lấy máu xét nghiệm, vừa chụp máy chiếu)
UPDATE rooms SET name = N'Phòng Xét Nghiệm & CĐHA' WHERE id = 6;
-- ============================================================
-- 4. Dọn dẹp Schema & Ràng buộc dữ liệu (Constraints)
-- ============================================================
-- Xoá cột is_lab_service (Vì logic Lab Queue giờ lấy theo service_type = 'DIAGNOSTIC')
ALTER TABLE services DROP COLUMN is_lab_service;
-- Thêm Check Constraint để đảm bảo dữ liệu nhập vào sau này chỉ có 3 loại chuẩn
ALTER TABLE services ADD CONSTRAINT CHK_services_type CHECK (service_type IN ('EXAM', 'DIAGNOSTIC', 'CARE'));

-- 1. Xoá Check Constraint cũ đang chặn việc cập nhật dữ liệu
ALTER TABLE services DROP CONSTRAINT CK_services_service_type;

-- 2. Chạy bù lệnh cập nhật dữ liệu ban nãy bị xịt
UPDATE services SET service_type = 'EXAM' WHERE id = 9;
UPDATE services SET service_type = 'DIAGNOSTIC' WHERE id IN (6, 7, 10, 11, 12, 13, 14);

-- 3. Tạo lại Check Constraint mới bao gồm 3 nhóm chuẩn xác
ALTER TABLE services ADD CONSTRAINT CK_services_service_type CHECK (service_type IN ('EXAM', 'DIAGNOSTIC', 'CARE'));

-- Đổi tạm service_type của dịch vụ Phẫu thuật thành EXAM để không vi phạm luật mới
UPDATE services SET service_type = 'EXAM' WHERE id = 8;

-- Chạy lại lệnh tạo Constraint (Lần này chắc chắn sẽ thành công)
ALTER TABLE services ADD CONSTRAINT CK_services_service_type CHECK (service_type IN ('EXAM', 'DIAGNOSTIC', 'CARE'));

-- ==========================================================
-- 1. CẬP NHẬT LẠI TÊN PHÒNG THEO CHUẨN THỰC TẾ (PHÒNG 201...)
-- ==========================================================
-- Khu vực Tầng 2: Khám Lâm Sàng (Map cứng với dịch vụ Khám tổng quát ID = 9)
UPDATE rooms SET name = N'Phòng 201' WHERE id = 1;
UPDATE rooms SET name = N'Phòng 202' WHERE id = 2;
UPDATE rooms SET name = N'Phòng 203' WHERE id = 3;
-- Khu vực Tầng 3: Chăm sóc & Phục hồi (Để NULL để nhận mọi gói CARE)
UPDATE rooms SET name = N'Phòng 301' WHERE id = 4;
UPDATE rooms SET name = N'Phòng 302' WHERE id = 5;
-- Khu vực Tầng 4: Chẩn đoán hình ảnh & Xét nghiệm (Để NULL để nhận mọi DIAGNOSTIC)
UPDATE rooms SET name = N'Phòng 401' WHERE id = 6; -- Dành cho đo khúc xạ, nhãn áp, siêu âm...
UPDATE rooms SET name = N'Phòng 402' WHERE id = 7; -- Xưởng gia công kính
-- ==========================================================

select * from rooms;
select id, name, service_type from services;
