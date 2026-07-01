-- ========================================================
-- Cập nhật status constraint trong ecms_db_final
-- ========================================================
USE ecms_db_final;
GO

IF EXISTS (SELECT 1 FROM sys.check_constraints WHERE name = 'CK_lab_orders_status' AND parent_object_id = OBJECT_ID('lab_orders'))
BEGIN
    ALTER TABLE lab_orders DROP CONSTRAINT CK_lab_orders_status;
    PRINT 'Đã xoá Check Constraint cũ CK_lab_orders_status trong ecms_db_final.';
END

UPDATE lab_orders SET status = 'APPROVED' WHERE status = 'COMPLETED';
UPDATE lab_orders SET status = 'REJECTED' WHERE status = 'CANCELLED';
PRINT 'Đã cập nhật các giá trị status cũ sang status mới trong ecms_db_final.';

ALTER TABLE lab_orders ADD CONSTRAINT CK_lab_orders_status CHECK (status IN ('PENDING', 'IN_PROGRESS', 'SUBMITTED', 'REJECTED', 'APPROVED'));
PRINT 'Đã tạo Check Constraint mới CK_lab_orders_status trong ecms_db_final.';
GO

-- ========================================================
-- Cập nhật status constraint trong ecms_backup
-- ========================================================
USE ecms_backup;
GO

IF EXISTS (SELECT 1 FROM sys.check_constraints WHERE name = 'CK_lab_orders_status' AND parent_object_id = OBJECT_ID('lab_orders'))
BEGIN
    ALTER TABLE lab_orders DROP CONSTRAINT CK_lab_orders_status;
    PRINT 'Đã xoá Check Constraint cũ CK_lab_orders_status trong ecms_backup.';
END

UPDATE lab_orders SET status = 'APPROVED' WHERE status = 'COMPLETED';
UPDATE lab_orders SET status = 'REJECTED' WHERE status = 'CANCELLED';
PRINT 'Đã cập nhật các giá trị status cũ sang status mới trong ecms_backup.';

ALTER TABLE lab_orders ADD CONSTRAINT CK_lab_orders_status CHECK (status IN ('PENDING', 'IN_PROGRESS', 'SUBMITTED', 'REJECTED', 'APPROVED'));
PRINT 'Đã tạo Check Constraint mới CK_lab_orders_status trong ecms_backup.';
GO

-- ========================================================
-- Cập nhật status constraint trong ecms_db
-- ========================================================
USE ecms_db;
GO

IF EXISTS (SELECT 1 FROM sys.check_constraints WHERE name = 'CK_lab_orders_status' AND parent_object_id = OBJECT_ID('lab_orders'))
BEGIN
    ALTER TABLE lab_orders DROP CONSTRAINT CK_lab_orders_status;
    PRINT 'Đã xoá Check Constraint cũ CK_lab_orders_status trong ecms_db.';
END

UPDATE lab_orders SET status = 'APPROVED' WHERE status = 'COMPLETED';
UPDATE lab_orders SET status = 'REJECTED' WHERE status = 'CANCELLED';

ALTER TABLE lab_orders ADD CONSTRAINT CK_lab_orders_status CHECK (status IN ('PENDING', 'IN_PROGRESS', 'SUBMITTED', 'REJECTED', 'APPROVED'));
PRINT 'Đã tạo Check Constraint mới CK_lab_orders_status trong ecms_db.';
GO
