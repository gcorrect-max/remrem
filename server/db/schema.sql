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

-- ── RTO Documents (Routine Test Overview – from CINNAMON database) ────────────
CREATE TABLE IF NOT EXISTS rto_documents (
  id              SERIAL PRIMARY KEY,
  name            VARCHAR(100) NOT NULL,          -- e.g. '5.2901.046J01'
  revision        VARCHAR(20)  NOT NULL,          -- e.g. 'A14'
  releaser        VARCHAR(100),                   -- e.g. 'J. Dobiáš'
  release_date    VARCHAR(20),                    -- stored as string: '18/02/2026'
  filename        VARCHAR(500),                   -- full Excel filename from CINNAMON
  bl30            BOOLEAN NOT NULL DEFAULT false, -- BL3.0? flag
  raw_json        JSONB,                          -- full RTO document JSON from LabVIEW
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (name, revision)
);

-- ── RTO Model identifiers (per document) ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS rto_identifiers (
  id              SERIAL PRIMARY KEY,
  rto_id          INT  NOT NULL REFERENCES rto_documents(id) ON DELETE CASCADE,
  model           VARCHAR(100),   -- e.g. 'REM102-G-G-AC1-W-8-4GS-O-000'
  article_number  VARCHAR(50),    -- e.g. '5.6602.022/01'
  sort_order      INT  NOT NULL DEFAULT 0
);

-- ── RTO Steps (per document, 2-D array row) ───────────────────────────────────
CREATE TABLE IF NOT EXISTS rto_steps (
  id              SERIAL PRIMARY KEY,
  rto_id          INT  NOT NULL REFERENCES rto_documents(id) ON DELETE CASCADE,
  step_no         VARCHAR(20),    -- e.g. '4.6'
  step_name       VARCHAR(500),   -- e.g. 'Power supply tests'
  model_values    JSONB,          -- array of per-model flag values: ["1","1","0",...]
  sort_order      INT  NOT NULL DEFAULT 0
);

-- ── Devices ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS devices (
  id                  SERIAL PRIMARY KEY,
  -- DUT identity
  model               VARCHAR(100),
  article_number      VARCHAR(50),
  article_revision    VARCHAR(20),
  article_name        VARCHAR(200),
  production_number   VARCHAR(50),
  serial_no           VARCHAR(50),
  -- RTO link (active document loaded by LabVIEW)
  rto_file            VARCHAR(100),   -- RTO document name, e.g. '5.2901.046J01'
  rto_revision        VARCHAR(20),    -- RTO document revision from CINNAMON, e.g. 'A14'
  -- Customer / order info from device certificate
  customer_purchaser  VARCHAR(200),   -- e.g. 'HaslerRail Italia s.r.l.'
  customer_project    VARCHAR(50),    -- e.g. '1130'
  supplier_order_no   VARCHAR(50),    -- e.g. '3032628'
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Device subsystems ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS device_subsystems (
  id          SERIAL PRIMARY KEY,
  device_id   INT REFERENCES devices(id) ON DELETE CASCADE,
  serial      VARCHAR(50),
  article     VARCHAR(50),
  revision    VARCHAR(20),
  description VARCHAR(200),
  master      VARCHAR(100),   -- e.g. 'REM CN' (board role / master label)
  sort_order  INT NOT NULL DEFAULT 0
);

-- ── Test sessions ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS test_sessions (
  id               SERIAL PRIMARY KEY,
  device_id        INT REFERENCES devices(id),
  rto_document_id  INT REFERENCES rto_documents(id),  -- RTO loaded for this session
  rto_revision     VARCHAR(20),                       -- denormalized for fast display
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
-- One row per executed VI step.
-- Populated by LabVIEW when a step finishes; Step.* fields mirror the LabVIEW
-- step-log cluster, ReportData mirrors the BookmarkVal/actions arrays.
CREATE TABLE IF NOT EXISTS test_results (
  id              SERIAL PRIMARY KEY,
  session_id      INT REFERENCES test_sessions(id) ON DELETE CASCADE,
  -- Step identification
  step_id         VARCHAR(20)  NOT NULL,  -- RTO step number, e.g. '4.7.9.1'
  step_label      VARCHAR(200),           -- short UI label
  -- Step execution data (from Step.* cluster)
  step_name       VARCHAR(500),           -- VI name, e.g. '4.7.9.1_AC_channel_16Hz_Calibration.vi'
  step_details    TEXT,                   -- Step.Details long description
  step_start      VARCHAR(20),            -- time string from LabVIEW, e.g. '12:53:22'
  step_stop       VARCHAR(20),
  -- Overall result
  result          VARCHAR(20) NOT NULL DEFAULT 'pending'
                    CHECK (result IN ('OK','FAIL','SKIP','RUNNING','pending')),
  -- Report data
  bookmark_values JSONB,   -- ReportData.BookmarkVal: [{Bookmark,Value}, ...]
  finished        BOOLEAN NOT NULL DEFAULT false,  -- ReportData.Finished?
  rtp100_index    INT,                             -- ReportData."Active RTP100 index"
  -- Action log (LabVIEW actions[] string array)
  actions         JSONB,   -- array of log-line strings
  -- JSON report blob (CINNAMON / CGI response)
  json_report     JSONB,   -- {cfg, querry, "response body", data}
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
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

-- ── Accuracy tests ────────────────────────────────────────────────────────────
-- One row per accuracy measurement run (DC or AC, one channel).
-- Linked to the test_result that triggered it.
CREATE TABLE IF NOT EXISTS accuracy_tests (
  id                      SERIAL PRIMARY KEY,
  result_id               INT REFERENCES test_results(id) ON DELETE CASCADE,
  -- Device Under Test (from device_under_test object)
  dut_name                VARCHAR(100),   -- e.g. 'REM102-DCAC-WR'
  dut_article_number      VARCHAR(50),
  dut_revision            VARCHAR(20),
  dut_serial_number       VARCHAR(50),
  dut_sw_version          VARCHAR(50),    -- e.g. '1.21.0'
  -- Interface / channel configuration (from interface_details object)
  channel                 VARCHAR(20),    -- e.g. 'Channel A'
  declared_class          VARCHAR(20),    -- e.g. '0,5 R'
  frequency               VARCHAR(20),    -- e.g. 'DC' | '50Hz' | '16Hz'
  vnp                     VARCHAR(20),    -- primary voltage nominal, e.g. '4200V'
  inp                     VARCHAR(20),    -- primary current nominal, e.g. '3000A'
  vns                     VARCHAR(20),    -- secondary voltage
  ins                     VARCHAR(20),    -- secondary current
  measure_period          VARCHAR(20),    -- e.g. '15' (seconds)
  global_kv               VARCHAR(30),    -- voltage ratio
  global_ki               VARCHAR(30),    -- current ratio
  -- Reference instrument (from reference_instrument object)
  ref_model               VARCHAR(100),   -- e.g. 'GS820 765601-F'
  ref_serial_number       VARCHAR(50),
  ref_calibration_date    VARCHAR(20),
  ref_calibration_due     VARCHAR(20),
  -- Test execution info (from test_information object)
  test_sw_version         VARCHAR(50),    -- e.g. 'RemVIEW 2.0.1'
  test_start_time         VARCHAR(50),    -- e.g. '19/01/2026 13:06:56'
  test_end_time           VARCHAR(50),
  execution_time          VARCHAR(100),   -- e.g. '5 minutes, 33 seconds'
  test_result             VARCHAR(20),    -- e.g. 'PASS' | 'FAIL'
  -- Notes
  test_notes              JSONB,          -- array of note strings
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Accuracy test points ──────────────────────────────────────────────────────
-- One row per measurement point inside an accuracy test (test_results array).
CREATE TABLE IF NOT EXISTS accuracy_test_points (
  id                      SERIAL PRIMARY KEY,
  accuracy_test_id        INT NOT NULL REFERENCES accuracy_tests(id) ON DELETE CASCADE,
  point_id                VARCHAR(20),    -- e.g. '1', '2', '3'
  area                    VARCHAR(50),    -- e.g. 'Area 1'
  energy_type             VARCHAR(10),    -- e.g. 'EA' | 'ER' | 'REA'
  vs_pct                  VARCHAR(20),    -- voltage percentage, e.g. '66%'
  is_pct                  VARCHAR(20),    -- current percentage, e.g. '120%'
  pf                      VARCHAR(20),    -- power factor or '-'
  vs_reading              VARCHAR(30),    -- Vs_Reading_[V]
  is_reading              VARCHAR(30),    -- Is_Reading_[A]
  active_energy_reading   VARCHAR(30),    -- Active_Energy_Reading_[Wh]
  pf_calculated           VARCHAR(30),    -- PF_Calculated
  reference_energy        VARCHAR(30),    -- e.g. '0.350kWh'
  reading_id              VARCHAR(30),    -- CEBD counter base ID, e.g. '4326'
  dut_energy              VARCHAR(30),    -- e.g. '0.350kWh'
  error_limit             VARCHAR(20),    -- Error_Limit_[EL], e.g. '0.50%'
  overall_uncertainty     VARCHAR(30),    -- Overall_Uncertainty_[UO]
  overall_instruments_err VARCHAR(30),    -- Overall_Instruments_Error_[EI]
  applied_limit           VARCHAR(30),    -- Applied_Limit_[EL-UO-EI], e.g. '0.382400%'
  dut_error               VARCHAR(20),    -- e.g. '0.033%'
  result                  VARCHAR(10),    -- 'OK' | 'FAIL'
  sort_order              INT NOT NULL DEFAULT 0
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
CREATE INDEX IF NOT EXISTS idx_test_steps_session        ON test_steps(session_id);
CREATE INDEX IF NOT EXISTS idx_test_results_session      ON test_results(session_id);
CREATE INDEX IF NOT EXISTS idx_result_params_result      ON test_result_params(result_id);
CREATE INDEX IF NOT EXISTS idx_result_logs_result        ON test_result_logs(result_id);
CREATE INDEX IF NOT EXISTS idx_subsystems_device         ON device_subsystems(device_id);
CREATE INDEX IF NOT EXISTS idx_rto_identifiers_rto       ON rto_identifiers(rto_id);
CREATE INDEX IF NOT EXISTS idx_rto_steps_rto             ON rto_steps(rto_id);
CREATE INDEX IF NOT EXISTS idx_accuracy_tests_result     ON accuracy_tests(result_id);
CREATE INDEX IF NOT EXISTS idx_accuracy_points_test      ON accuracy_test_points(accuracy_test_id);
CREATE INDEX IF NOT EXISTS idx_test_sessions_rto         ON test_sessions(rto_document_id);
CREATE INDEX IF NOT EXISTS idx_test_sessions_device      ON test_sessions(device_id);
