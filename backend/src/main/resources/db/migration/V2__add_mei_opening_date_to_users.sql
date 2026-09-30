-- Date the MEI was opened, used for the proportional annual limit (RN01).
-- Null means the MEI was opened before the year being consulted.
ALTER TABLE users ADD COLUMN mei_opening_date DATE;
