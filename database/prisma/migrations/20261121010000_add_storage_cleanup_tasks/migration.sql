-- Durable, deduplicated retry queue for R2 cleanup. It intentionally has no
-- foreign key to product_images because the product/image metadata may be gone
-- before the R2 object can be removed.
CREATE TYPE storage_cleanup_status AS ENUM ('PENDING', 'PROCESSING');

CREATE TABLE storage_cleanup_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  operation VARCHAR(40) NOT NULL,
  object_key TEXT NOT NULL,
  status storage_cleanup_status NOT NULL DEFAULT 'PENDING',
  attempt_count INT NOT NULL DEFAULT 0,
  next_attempt_at TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  lease_until TIMESTAMPTZ(6),
  last_error_code VARCHAR(80),
  created_at TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  CONSTRAINT uq_storage_cleanup_operation_key UNIQUE (operation, object_key)
);
CREATE INDEX idx_storage_cleanup_pending ON storage_cleanup_tasks(status, next_attempt_at);
CREATE TRIGGER trg_storage_cleanup_tasks_updated_at BEFORE UPDATE ON storage_cleanup_tasks
FOR EACH ROW EXECUTE FUNCTION set_updated_at();
REVOKE ALL ON TABLE storage_cleanup_tasks FROM PUBLIC, anon, authenticated;
