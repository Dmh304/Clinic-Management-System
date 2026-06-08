ALTER TABLE appointments
DROP CONSTRAINT CK_appointments_status;

ALTER TABLE appointments
ADD CONSTRAINT CK_appointments_status
CHECK (status IN ('PENDING', 'CONFIRMED', 'WAITING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'));

-- Fix: SQL Server khong cho nhieu NULL trong UNIQUE CONSTRAINT.
-- Doi thanh filtered unique index de chi ap dung khi cccd khac NULL.
-- (Da ap dung tren ecms_db local 2026-06-09 - sua loi "Violation of UNIQUE KEY
--  constraint UQ_patients_cccd ... duplicate key value is (<NULL>)" khi cap nhat
--  ho so cho tai khoan dang nhap bang Google chua co Patient record.)
-- Luu y: filtered index can SET QUOTED_IDENTIFIER ON va phai chay trong batch
-- rieng (sau GO) thi CREATE UNIQUE INDEX moi thanh cong.
ALTER TABLE patients DROP CONSTRAINT UQ_patients_cccd;
GO
SET QUOTED_IDENTIFIER ON;
GO
CREATE UNIQUE INDEX UQ_patients_cccd ON patients(cccd) WHERE cccd IS NOT NULL;
GO

-- Fix tuong tu cho patient_code: cot nay truoc day khong duoc quan ly boi JPA
-- nen tat ca insert vao NULL. Doi thanh filtered index + cho phep NULL.
-- (Da ap dung tren ecms_db local 2026-06-09 - cung loi "Violation of UNIQUE KEY
--  constraint UQ_patients_patient_code ... duplicate key value is (<NULL>)" khi
--  tao Patient record moi cho tai khoan dang nhap bang Google.)
ALTER TABLE patients DROP CONSTRAINT UQ_patients_patient_code;
GO
ALTER TABLE patients ALTER COLUMN patient_code NVARCHAR(20) NULL;
GO
SET QUOTED_IDENTIFIER ON;
GO
CREATE UNIQUE INDEX UQ_patients_patient_code ON patients(patient_code) WHERE patient_code IS NOT NULL;
GO


--Sửa lỗi phông chữ
USE ecms_db;
GO

ALTER TABLE doctors
ALTER COLUMN specialty NVARCHAR(100) NOT NULL;
GO

UPDATE doctors
SET specialty = N'Khoa mắt tổng quát'
WHERE id = 1;

UPDATE doctors
SET specialty = N'Khúc xạ & Kính áp tròng'
WHERE id = 2;

UPDATE doctors
SET specialty = N'Phẫu thuật mắt'
WHERE id = 3;
GO

SELECT id, full_name, specialty, CONVERT(VARBINARY(MAX), specialty) AS raw_bytes
FROM doctors;