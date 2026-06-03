ALTER TABLE appointments
DROP CONSTRAINT CK_appointments_status;

ALTER TABLE appointments
ADD CONSTRAINT CK_appointments_status
CHECK (status IN ('PENDING', 'CONFIRMED', 'WAITING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'));

-- Fix: SQL Server khong cho nhieu NULL trong UNIQUE CONSTRAINT.
-- Doi thanh filtered unique index de chi ap dung khi cccd khac NULL.
ALTER TABLE patients DROP CONSTRAINT UQ_patients_cccd;
CREATE UNIQUE INDEX UQ_patients_cccd ON patients(cccd) WHERE cccd IS NOT NULL;

-- Fix tuong tu cho patient_code: cot nay truoc day khong duoc quan ly boi JPA
-- nen tat ca insert vao NULL. Doi thanh filtered index + cho phep NULL.
ALTER TABLE patients DROP CONSTRAINT UQ_patients_patient_code;
ALTER TABLE patients ALTER COLUMN patient_code NVARCHAR(20) NULL;
CREATE UNIQUE INDEX UQ_patients_patient_code ON patients(patient_code) WHERE patient_code IS NOT NULL;