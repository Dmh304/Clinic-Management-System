-- ==========================================
-- Migration cho database ecms_db_final
-- ==========================================
USE ecms_db_final;
GO

IF EXISTS (SELECT 1 FROM sys.check_constraints WHERE name = 'CK_lab_orders_priority' AND parent_object_id = OBJECT_ID('lab_orders'))
BEGIN
    ALTER TABLE lab_orders DROP CONSTRAINT CK_lab_orders_priority;
END

UPDATE lab_orders SET priority = 'PRIMARY' WHERE priority = 'NORMAL';
UPDATE lab_orders SET priority = 'EMERGENCY' WHERE priority = 'URGENT';

DECLARE @DefaultConstraintName1 NVARCHAR(255);
SELECT @DefaultConstraintName1 = dc.name
FROM sys.default_constraints dc
JOIN sys.columns c ON dc.parent_object_id = c.object_id AND dc.parent_column_id = c.column_id
WHERE dc.parent_object_id = OBJECT_ID('lab_orders') AND c.name = 'priority';

IF @DefaultConstraintName1 IS NOT NULL
BEGIN
    DECLARE @DropDefaultSQL1 NVARCHAR(MAX) = 'ALTER TABLE lab_orders DROP CONSTRAINT ' + @DefaultConstraintName1;
    EXEC sp_executesql @DropDefaultSQL1;
END

ALTER TABLE lab_orders ADD CONSTRAINT DF_lab_orders_priority DEFAULT 'PRIMARY' FOR priority;
ALTER TABLE lab_orders ADD CONSTRAINT CK_lab_orders_priority CHECK (priority IN ('PRIMARY', 'WARNING', 'EMERGENCY'));
GO


-- ==========================================
-- Migration cho database ecms_backup
-- ==========================================
USE ecms_backup;
GO

IF EXISTS (SELECT 1 FROM sys.check_constraints WHERE name = 'CK_lab_orders_priority' AND parent_object_id = OBJECT_ID('lab_orders'))
BEGIN
    ALTER TABLE lab_orders DROP CONSTRAINT CK_lab_orders_priority;
END

UPDATE lab_orders SET priority = 'PRIMARY' WHERE priority = 'NORMAL';
UPDATE lab_orders SET priority = 'EMERGENCY' WHERE priority = 'URGENT';

DECLARE @DefaultConstraintName2 NVARCHAR(255);
SELECT @DefaultConstraintName2 = dc.name
FROM sys.default_constraints dc
JOIN sys.columns c ON dc.parent_object_id = c.object_id AND dc.parent_column_id = c.column_id
WHERE dc.parent_object_id = OBJECT_ID('lab_orders') AND c.name = 'priority';

IF @DefaultConstraintName2 IS NOT NULL
BEGIN
    DECLARE @DropDefaultSQL2 NVARCHAR(MAX) = 'ALTER TABLE lab_orders DROP CONSTRAINT ' + @DefaultConstraintName2;
    EXEC sp_executesql @DropDefaultSQL2;
END

ALTER TABLE lab_orders ADD CONSTRAINT DF_lab_orders_priority DEFAULT 'PRIMARY' FOR priority;
ALTER TABLE lab_orders ADD CONSTRAINT CK_lab_orders_priority CHECK (priority IN ('PRIMARY', 'WARNING', 'EMERGENCY'));
GO
