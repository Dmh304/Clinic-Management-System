-- Fix: patient1..patient5 (id 10-14) bị seed sai role_id = 7 (NURSE) thay vì 8 (PATIENT).
-- Lỗi phát sinh từ commit eca5580 khi migrate từ bảng user_roles sang cột users.role_id
-- (xem ecms_data_seed.sql — bản gốc trước migration gán đúng role_id = 8 cho 5 user này).
-- Script này sửa dữ liệu đã tồn tại trong DB; ecms_data_seed.sql cũng đã được sửa cho lần
-- seed mới.

USE ecms_db;
GO

UPDATE users
SET role_id = (SELECT id FROM roles WHERE role_name = 'PATIENT')
WHERE id IN (10, 11, 12, 13, 14)
  AND role_id = (SELECT id FROM roles WHERE role_name = 'NURSE');
GO
