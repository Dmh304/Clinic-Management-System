USE ecms_db;
GO
UPDATE medicines SET unit = N'Lọ 5ml' WHERE id IN (1, 2, 4, 6);
UPDATE medicines SET unit = N'Lọ 10ml' WHERE id = 3;
UPDATE prescription_items SET instructions = REPLACE(CAST(instructions AS NVARCHAR(MAX)), N'L?', N'Lọ');
UPDATE prescription_items SET instructions = REPLACE(CAST(instructions AS NVARCHAR(MAX)), N'l?', N'lọ');
GO
