-- ustaw domyślną wartość id jako uuid (jeśli nie masz rozszerzenia, dodaj je)
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

ALTER TABLE "CourseCategory"
    ALTER COLUMN "id" SET DEFAULT gen_random_uuid()::text;-- This is an empty migration.