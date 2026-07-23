select * from users
update users set password = N'$2a$10$gfSU.mS4YQd7cICUyobl/en..jS9epCm4YpeYiRbllaEL2TbAOGmy';

select * from doctors 
select * from services
select * from lab_orders
select * from roles;
UPDATE users 
SET role_id = 8 
WHERE (id BETWEEN 10 AND 14) 
   OR (id BETWEEN 16 AND 23);

   select * from patients;
   select * from appointments where patient_id = 1;