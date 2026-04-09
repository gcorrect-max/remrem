-- ============================================================
-- REMview v3 – PostgreSQL schema
-- ============================================================

-- ── Extensions ────────────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ── Users ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id              SERIAL PRIMARY KEY,
  username        VARCHAR(50)  UNIQUE NOT NULL,
  password_hash   VARCHAR(255) NOT NULL,
  display_name    VARCHAR(100) NOT NULL,
  role            VARCHAR(20)  NOT NULL DEFAULT 'viewer'
                    CHECK (role IN ('admin','operator','viewer','guest')),
  active          BOOLEAN      NOT NULL DEFAULT true,
  -- nav permissions
  perm_overview       BOOLEAN NOT NULL DEFAULT true,
  perm_results        BOOLEAN NOT NULL DEFAULT false,
  perm_config         BOOLEAN NOT NULL DEFAULT false,
  perm_device_status  BOOLEAN NOT NULL DEFAULT false,
  perm_station_schema BOOLEAN NOT NULL DEFAULT false,
  perm_settings       BOOLEAN NOT NULL DEFAULT false,
  perm_help           BOOLEAN NOT NULL DEFAULT true,
  perm_authorization  BOOLEAN NOT NULL DEFAULT false,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Devices ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS devices (
  id                SERIAL PRIMARY KEY,
  model             VARCHAR(100),
  article_number    VARCHAR(50),
  production_number VARCHAR(50),
  serial_no         VARCHAR(50),
  rto_file          VARCHAR(50),
  rto_revision      VARCHAR(20),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Device subsystems ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS device_subsystems (
  id          SERIAL PRIMARY KEY,
  device_id   INT REFERENCES devices(id) ON DELETE CASCADE,
  serial      VARCHAR(50),
  article     VARCHAR(50),
  revision    VARCHAR(20),
  description VARCHAR(200),
  sort_order  INT NOT NULL DEFAULT 0
);

-- ── Test sessions ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS test_sessions (
  id               SERIAL PRIMARY KEY,
  device_id        INT REFERENCES devices(id),
  operator         VARCHAR(100),
  start_time       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  end_time         TIMESTAMPTZ,
  duration_seconds INT,
  overall_status   VARCHAR(20) NOT NULL DEFAULT 'pending'
                     CHECK (overall_status IN ('pending','running','ok','fail')),
  progress_current INT NOT NULL DEFAULT 0,
  progress_total   INT NOT NULL DEFAULT 18,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Test steps ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS test_steps (
  id         SERIAL PRIMARY KEY,
  session_id INT REFERENCES test_sessions(id) ON DELETE CASCADE,
  step_id    VARCHAR(20) NOT NULL,
  label      VARCHAR(200),
  status     VARCHAR(20) NOT NULL DEFAULT 'pending'
               CHECK (status IN ('ok','fail','running','pending','skipped')),
  sort_order INT NOT NULL DEFAULT 0
);

-- ── Test results ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS test_results (
  id         SERIAL PRIMARY KEY,
  session_id INT REFERENCES test_sessions(id) ON DELETE CASCADE,
  step_id    VARCHAR(20) NOT NULL,
  step_label VARCHAR(200),
  details    TEXT,
  result     VARCHAR(20) NOT NULL DEFAULT 'pending'
               CHECK (result IN ('OK','FAIL','SKIP','RUNNING','pending')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Test result parameters (key–value) ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS test_result_params (
  id        SERIAL PRIMARY KEY,
  result_id INT REFERENCES test_results(id) ON DELETE CASCADE,
  key       VARCHAR(100),
  value     TEXT
);

-- ── Test result log lines ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS test_result_logs (
  id         SERIAL PRIMARY KEY,
  result_id  INT REFERENCES test_results(id) ON DELETE CASCADE,
  line       TEXT,
  ts         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  sort_order INT NOT NULL DEFAULT 0
);

-- ── Drawings (base64 image data) ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS drawings (
  id           VARCHAR(50) PRIMARY KEY,   -- 'main', 'cable01', …
  label        VARCHAR(200),
  image_base64 TEXT,                      -- PNG/SVG encoded as base64
  mime_type    VARCHAR(50) NOT NULL DEFAULT 'image/png',
  sort_order   INT  NOT NULL DEFAULT 0,
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Instruments ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS instruments (
  id         VARCHAR(50) PRIMARY KEY,
  label      VARCHAR(100),
  status     VARCHAR(20) NOT NULL DEFAULT 'offline'
               CHECK (status IN ('ok','warn','error','offline')),
  icon       VARCHAR(20),
  type       VARCHAR(50),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Module configs (hardware + software JSON blobs) ───────────────────────────
CREATE TABLE IF NOT EXISTS module_configs (
  id          VARCHAR(50)  NOT NULL,
  group_name  VARCHAR(50)  NOT NULL,
  title       VARCHAR(200),
  short_label VARCHAR(100),
  source_path VARCHAR(500),
  summary     TEXT,
  config      JSONB,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (id, group_name)
);

-- ── App settings (generic key–value JSONB store) ──────────────────────────────
CREATE TABLE IF NOT EXISTS app_settings (
  key        VARCHAR(100) PRIMARY KEY,
  value      JSONB,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Indexes ───────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_test_steps_session   ON test_steps(session_id);
CREATE INDEX IF NOT EXISTS idx_test_results_session ON test_results(session_id);
CREATE INDEX IF NOT EXISTS idx_result_params_result ON test_result_params(result_id);
CREATE INDEX IF NOT EXISTS idx_result_logs_result   ON test_result_logs(result_id);
CREATE INDEX IF NOT EXISTS idx_subsystems_device    ON device_subsystems(device_id);
