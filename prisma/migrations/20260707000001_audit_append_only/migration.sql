-- Chain of custody: audit_log append-only, ditegakkan di level izin database.
-- Aplikasi TIDAK boleh konek sebagai superuser (superuser melewati semua ACL),
-- jadi dibuat role lindra_app khusus aplikasi: boleh INSERT/SELECT audit_log,
-- UPDATE/DELETE ditolak Postgres — bukan sekadar logika aplikasi.

DO $$ BEGIN
  CREATE ROLE lindra_app LOGIN PASSWORD 'lindra_app_dev';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

GRANT USAGE ON SCHEMA public TO lindra_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO lindra_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO lindra_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO lindra_app;

REVOKE UPDATE, DELETE ON "audit_log" FROM lindra_app;
