USE ecms_db;
GO

-- 1. Tìm và xoá Default Constraint cũ trên cột priority của bảng lab_orders
DECLARE @DefaultConstraintName NVARCHAR(255);
SELECT @DefaultConstraintName = dc.name
FROM sys.default_constraints dc
JOIN sys.columns c ON dc.parent_object_id = c.object_id AND dc.parent_column_id = c.column_id
WHERE dc.parent_object_id = OBJECT_ID('lab_orders') AND c.name = 'priority';

IF @DefaultConstraintName IS NOT NULL
BEGIN
    DECLARE @DropDefaultSQL NVARCHAR(MAX) = 'ALTER TABLE lab_orders DROP CONSTRAINT ' + @DefaultConstraintName;
    EXEC sp_executesql @DropDefaultSQL;
    PRINT 'Đã xoá Default Constraint cũ: ' + @DefaultConstraintName;
END

-- 2. Thêm Default Constraint mới là 'PRIMARY' cho cột priority
ALTER TABLE lab_orders ADD CONSTRAINT DF_lab_orders_priority DEFAULT 'PRIMARY' FOR priority;
PRINT 'Đã thêm Default Constraint mới (DEFAULT ''PRIMARY'') cho cột priority.';

-- 3. Xoá Check Constraint cũ CK_lab_orders_priority nếu tồn tại
IF EXISTS (SELECT 1 FROM sys.check_constraints WHERE name = 'CK_lab_orders_priority' AND parent_object_id = OBJECT_ID('lab_orders'))
BEGIN
    ALTER TABLE lab_orders DROP CONSTRAINT CK_lab_orders_priority;
    PRINT 'Đã xoá Check Constraint cũ CK_lab_orders_priority.';
END

-- 4. Thêm Check Constraint mới CK_lab_orders_priority ('PRIMARY', 'WARNING', 'EMERGENCY')
ALTER TABLE lab_orders ADD CONSTRAINT CK_lab_orders_priority CHECK (priority IN ('PRIMARY', 'WARNING', 'EMERGENCY'));
PRINT 'Đã thêm Check Constraint mới CK_lab_orders_priority (CHECK IN (''PRIMARY'', ''WARNING'', ''EMERGENCY'')).';
GO
