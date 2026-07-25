SELECT
    cc.name AS constraint_name,
    cc.definition
FROM sys.check_constraints cc
WHERE cc.name = 'CK_medical_records_status';

ALTER TABLE dbo.medical_records
DROP CONSTRAINT CK_medical_records_status;

ALTER TABLE dbo.medical_records
ADD CONSTRAINT CK_medical_records_status
CHECK (status IN ('DRAFT', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'));

select * from glasses_orders;
select * from roles
select * from services
select * from service_categories
select * from eyeglass_prescriptions

alter table services add is_lab_service bit;
insert into services (is_lab_service) values (0), (0), (0), (0), (0), (1), (1), (0), (0), (0), (0), (0), (1), (1)
UPDATE services 
SET is_lab_service = 0 
WHERE id NOT IN (6, 7, 13, 14);

select * from users;
select * from roles