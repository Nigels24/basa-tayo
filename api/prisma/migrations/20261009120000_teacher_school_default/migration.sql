-- Teacher self-registration. users.school and users.section already exist
-- (init migration), so this is data only: teachers created before sign-up
-- existed get the pilot school. Idempotent; never overwrites a set school.
UPDATE "users"
SET "school" = 'Dumingag Central Elementary School'
WHERE "role" = 'TEACHER' AND ("school" IS NULL OR btrim("school") = '');
