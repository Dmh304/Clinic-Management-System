-- UC-57 - Manage System Audit Log
-- Bảo vệ tính append-only của bảng audit_logs ở mức database: ứng dụng (và bất kỳ ai dùng
-- chung login này) chỉ được INSERT/SELECT, không được UPDATE/DELETE bản ghi audit log.
--
-- Script này KHÔNG chạy tự động (không nằm trong luồng migration tự động của ứng dụng).
-- Chạy thủ công bởi DBA sau khi xác định login ứng dụng dùng để kết nối tới ecms_db.
--
-- LƯU Ý: môi trường dev hiện dùng login "sa" (sysadmin), không thể bị REVOKE quyền vì sa
-- luôn có toàn quyền. Trước khi áp dụng script này ở production, hãy tạo một SQL login
-- riêng cho ứng dụng (không phải sa) và thay <APP_DB_USER> bằng tên login đó.

USE ecms_db;
GO

REVOKE UPDATE ON dbo.audit_logs FROM [<APP_DB_USER>];
REVOKE DELETE ON dbo.audit_logs FROM [<APP_DB_USER>];
GRANT INSERT, SELECT ON dbo.audit_logs TO [<APP_DB_USER>];
GO

UPDATE users
SET role_id = (SELECT id FROM roles WHERE role_name = 'ADMIN')
WHERE email = 'mh3k42k6@gmail.com';

UPDATE users
SET role_id = (SELECT id FROM roles WHERE role_name = 'ADMIN'),
    auth_provider = 'LOCAL'
WHERE email = 'mh3k42k6@gmail.com';

UPDATE users
SET phone_number = '0967396756',
    date_of_birth = '2006-04-30',
    gender = 'MALE',
    address = N'Ngũ Phúc, Kim Thành, Hải Dương',
    email_verified_at = SYSDATETIME()
WHERE id = 20;

UPDATE users
SET role_id = (SELECT id FROM roles WHERE role_name = 'ADMIN'),
    auth_provider = 'LOCAL',
    password = '$2a$10$F4PmaoxYopu05cDVZz/9AeJPpenfcOp2xVzAJH2LIH8gOzDDOoehS',
    status = 'ACTIVE'
WHERE id = 20;
