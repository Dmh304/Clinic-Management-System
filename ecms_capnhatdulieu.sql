--Cập nhật db
USE ecms_db;

DECLARE @today DATETIME2 = CAST(CAST(GETDATE() AS DATE) AS DATETIME2);

INSERT INTO appointments (patient_id, doctor_id, service_id, appointment_time, type, status, created_at)
VALUES
(1, 1, 1, DATEADD(MINUTE, 8*60+0,  @today), 'ONLINE',  'PENDING',   GETDATE()),
(2, 2, 2, DATEADD(MINUTE, 9*60+30, @today), 'WALK_IN', 'CONFIRMED', GETDATE()),
(3, 3, 8, DATEADD(MINUTE, 10*60+0, @today), 'ONLINE',  'PENDING',   GETDATE());