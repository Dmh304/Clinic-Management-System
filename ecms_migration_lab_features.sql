-- ============================================================
-- ECMS — Migration: cải thiện DB cho Lab Technician
-- Chỉ chạy file này nếu DB của bạn đã được tạo TRƯỚC khi
-- ecms_schema.sql được cập nhật (tức là đã chạy schema cũ rồi).
-- Nếu tạo DB mới từ ecms_schema.sql (bản mới nhất), KHÔNG cần
-- chạy file này — schema mới đã bao gồm đầy đủ các thay đổi dưới đây.
--
-- Nội dung:
--   1. medical_records: thêm image_url
--   2. lab_orders: thêm rejection_reason, rejected_at + mở rộng
--      CHECK constraint status để cho phép 'REJECTED'
--   3. lab_results: thêm các cột mắt chi tiết (va/bcva/sph/cyl/axis/iop
--      trái-phải), giữ lại result_data làm cột dữ liệu mở cho các xét
--      nghiệm không theo khuôn mắt T/P (máu, OCT, Topo...), xóa cột status
--   4. Tạo bảng lab_technicians
-- ============================================================

USE ecms_db;
GO
SET QUOTED_IDENTIFIER ON;
GO

-- ============================================================
-- 1. medical_records: thêm image_url
-- ============================================================
ALTER TABLE medical_records
    ADD image_url NVARCHAR(500) NULL;
GO

-- ============================================================
-- 2. lab_orders: thêm rejection_reason, rejected_at
--    + mở rộng CHECK constraint cho phép status = 'REJECTED'
-- ============================================================
ALTER TABLE lab_orders
    ADD rejection_reason NVARCHAR(MAX) NULL,
        rejected_at      DATETIME2     NULL;
GO

ALTER TABLE lab_orders
    DROP CONSTRAINT CK_lab_orders_status;
GO

ALTER TABLE lab_orders
    ADD CONSTRAINT CK_lab_orders_status
    CHECK (status IN ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'REJECTED'));
GO

-- ============================================================
-- 3. lab_results:
--    - Thêm các cột mắt chi tiết (giống medical_records) cho nhóm
--      xét nghiệm khúc xạ/thị lực/nhãn áp.
--    - Giữ lại result_data làm cột dữ liệu mở (JSON tự do) cho các
--      xét nghiệm không theo khuôn mắt T/P (xét nghiệm máu, OCT, Topo...).
--    - Xóa cột status: trạng thái "đã review hay chưa" suy ra từ
--      reviewed_at (NULL = chưa review). lab_order_items.status mới
--      là nơi theo dõi vòng đời PENDING/IN_PROGRESS/COMPLETED của
--      từng xét nghiệm trong đơn.
-- ============================================================
ALTER TABLE lab_results
    ADD va_l   DECIMAL(4,2)  NULL,
        va_r   DECIMAL(4,2)  NULL,
        bcva_l DECIMAL(4,2)  NULL,
        bcva_r DECIMAL(4,2)  NULL,
        sph_l  DECIMAL(5,2)  NULL,
        cyl_l  DECIMAL(5,2)  NULL,
        axis_l SMALLINT      NULL,
        iop_l  DECIMAL(4,1)  NULL,
        sph_r  DECIMAL(5,2)  NULL,
        cyl_r  DECIMAL(5,2)  NULL,
        axis_r SMALLINT      NULL,
        iop_r  DECIMAL(4,1)  NULL;
GO

-- Xóa CHECK constraint của cột status trước khi drop cột
ALTER TABLE lab_results
    DROP CONSTRAINT CK_lab_results_status;
GO

-- Cột status có DEFAULT 'PENDING' khai báo inline khi tạo bảng, nên SQL
-- Server tự sinh tên constraint hệ thống cho default đó — phải tìm và
-- xóa nó trước khi DROP COLUMN mới thành công.
DECLARE @df_name NVARCHAR(200);
SELECT @df_name = dc.name
FROM sys.default_constraints dc
JOIN sys.columns c ON c.object_id = dc.parent_object_id AND c.column_id = dc.parent_column_id
WHERE dc.parent_object_id = OBJECT_ID('lab_results') AND c.name = 'status';

IF @df_name IS NOT NULL
    EXEC('ALTER TABLE lab_results DROP CONSTRAINT ' + @df_name);
GO

ALTER TABLE lab_results
    DROP COLUMN status;
GO

-- ============================================================
-- 4. Tạo bảng lab_technicians — hồ sơ riêng cho Kỹ thuật viên xét
--    nghiệm (giống doctors); trước đây chỉ là 1 user gắn role
--    LAB_TECHNICIAN + 1 dòng staffs chung, không có license/chuyên
--    môn thiết bị riêng.
-- ============================================================
CREATE TABLE lab_technicians (
    id              BIGINT          NOT NULL IDENTITY(1,1),
    user_id         BIGINT          NOT NULL,
    lab_tech_code   NVARCHAR(20)    NOT NULL,
    full_name       NVARCHAR(255)   NOT NULL,
    license_number  NVARCHAR(100)   NULL,
    specialization  NVARCHAR(255)   NULL,
    phone_number    NVARCHAR(15)    NULL,
    email           NVARCHAR(255)   NULL,
    status          NVARCHAR(20)    NOT NULL DEFAULT 'ACTIVE',
    created_at      DATETIME2       NOT NULL DEFAULT GETDATE(),
    updated_at      DATETIME2       NULL,
    CONSTRAINT PK_lab_technicians PRIMARY KEY (id),
    CONSTRAINT UQ_lab_technicians_user_id UNIQUE (user_id),
    CONSTRAINT UQ_lab_technicians_lab_tech_code UNIQUE (lab_tech_code),
    CONSTRAINT FK_lab_technicians_user FOREIGN KEY (user_id) REFERENCES users(id),
    CONSTRAINT CK_lab_technicians_status CHECK (status IN ('ACTIVE', 'INACTIVE'))
);
GO

PRINT N'✅ Migration lab_features hoàn tất: medical_records.image_url, lab_orders.rejection_reason/rejected_at + REJECTED status, lab_results (thêm cột mắt + xóa status), bảng lab_technicians.';
GO
