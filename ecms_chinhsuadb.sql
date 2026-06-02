ALTER TABLE appointments
DROP CONSTRAINT CK_appointments_status;

ALTER TABLE appointments
ADD CONSTRAINT CK_appointments_status
CHECK (status IN ('PENDING', 'CONFIRMED', 'WAITING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'));