-- ============================================================
-- REMview v3 – Seed data
-- bcrypt hashes for passwords (cost 10):
--   admin    → 'REMATE'
--   operator → 'testoperator'
--   viewer   → 'view1'
-- ============================================================

-- ── Users ─────────────────────────────────────────────────────────────────────
INSERT INTO users (username, password_hash, display_name, role, active,
  perm_overview, perm_results, perm_config, perm_device_status,
  perm_station_schema, perm_settings, perm_help, perm_authorization)
VALUES
  ('admin',    crypt('REMATE',       gen_salt('bf', 10)),
   'Administrator', 'admin', true,
   true, true, true, true, true, true, true, true),
  ('operator', crypt('testoperator', gen_salt('bf', 10)),
   'Test Operator', 'operator', true,
   true, true, true, true, true, false, true, false),
  ('viewer',   crypt('view1',        gen_salt('bf', 10)),
   'Read-Only Viewer', 'viewer', true,
   true, true, false, true, true, false, true, false),
  ('guest',    crypt('',             gen_salt('bf', 10)),
   'Guest', 'guest', true,
   true, false, false, false, false, false, true, false)
ON CONFLICT (username) DO NOTHING;

-- ── Default device ────────────────────────────────────────────────────────────
INSERT INTO devices (model, article_number, production_number, serial_no, rto_file, rto_revision)
VALUES ('REM102-G-G-S-T-W-8-GS-O-000', '5.6602.013/01', '', '21292853', '5.2901.047J01', 'A51')
ON CONFLICT DO NOTHING;

-- ── Device subsystems ─────────────────────────────────────────────────────────
INSERT INTO device_subsystems (device_id, serial, article, revision, description, sort_order)
SELECT d.id, s.serial, s.article, s.revision, s.description, s.ord
FROM devices d,
(VALUES
  ('19252995','5.6602.316/08','A01','BOARD REM102PCU-108',   0),
  ('20212865','5.6602.313/01','A02','BOARD REM102CN-401',    1),
  ('20341058','5.6602.311/20','A00','BOARD REM102DSPW-320',  2),
  ('21081218','80002900',     'D01','BOARD MPC107-001',      3),
  ('21202692','80002760',     'D08','BOARD REM102OLED-000',  4)
) AS s(serial, article, revision, description, ord)
WHERE d.serial_no = '21292853'
ON CONFLICT DO NOTHING;

-- ── Instruments ───────────────────────────────────────────────────────────────
INSERT INTO instruments (id, label, status, icon, type) VALUES
  ('CINNAMON','CINNAMON','offline','🗄️','database'),
  ('HART',    'HART',    'offline','🗄️','database'),
  ('PSU',     'PSU',     'offline','🖨️','instrument'),
  ('YKGS820', 'YKGS820', 'offline','📟','meter'),
  ('WT3000',  'WT3000',  'offline','📟','meter'),
  ('3446A',   '3446A',   'offline','📟','meter'),
  ('REM102',  'REM102',  'offline','📦','dut')
ON CONFLICT (id) DO NOTHING;

-- ── Drawings (empty placeholders – LabVIEW fills image_base64) ───────────────
INSERT INTO drawings (id, label, sort_order) VALUES
  ('main',    'REM102 – Main View',  0),
  ('cable01', 'Cable01 – Power',     1),
  ('cable02', 'Cable02 – Serial',    2),
  ('cable03', 'Cable03 – AC Input',  3),
  ('cable04', 'Cable04 – DC Input',  4),
  ('cable05', 'Cable05 – Ethernet',  5)
ON CONFLICT (id) DO NOTHING;

-- ── App settings ──────────────────────────────────────────────────────────────
INSERT INTO app_settings (key, value) VALUES
  ('autoSave',     'true'),
  ('darkMode',     'true'),
  ('language',     '"en"'),
  ('testTimeout',  '60'),
  ('logLevel',     '"INFO"'),
  ('exportPath',   '"C:\\\\TestResults\\\\"'),
  ('notifyOnFail', 'true')
ON CONFLICT (key) DO NOTHING;

-- ── Module configs (hardware) ─────────────────────────────────────────────────
INSERT INTO module_configs (id, group_name, title, short_label, summary, config) VALUES
('digital-io', 'hardware', 'Digital I/O', 'DIO / NI-USB6525',
 'Digital I/O activation and VISA resource settings.',
 '{"Device active":false,"VISA resource":"NI-USB6525","Reset (True)":false,"ID Query (True)":true}'::jsonb),

('power-supply', 'hardware', 'Power Supply', 'PSU',
 'Power supply VISA target, settling times and output defaults.',
 '{"Device active":true,"VISA name":"TCPIP0::192.168.128.10::inst0::INSTR","IP":"192.168.128.10","Device power supply":{"Voltage":24,"Current":0.5}}'::jsonb),

('dsp-registers', 'hardware', 'DSP Registers', 'DSP / TCP',
 'TCP endpoint and register offsets/gains for channels A and B.',
 '{"IP String":"192.168.128.100","TCP port":1100,"timeout":10000,"RTU? (FALSE: ETH)":false}'::jsonb),

('rem102-login', 'hardware', 'REM102 Login', 'REM102 / CGI',
 'REM102 network login, CGI endpoint and cookie names.',
 '{"RM102_Login":{"IP No.":"192.168.128.1","Login":{"username":"Admin","pwd":"Adm1@Rem"}},"MPC105 CGI string":"/cgi-bin/mpc105.fcgi"}'::jsonb),

('switch', 'hardware', 'Switch', 'Switch / RASBA-RAMBA',
 'Digital switch routing, NI device mapping and startup safe states.',
 '{"Device active":true,"RAMBA RASBA active":true,"DIO NI Device":"NI_USB_DEV1"}'::jsonb),

('wt3000', 'hardware', 'WT3000', 'WT3000',
 'WT3000 power analyzer network/VISA identity.',
 '{"Device active":true,"VISA name":"WT3000-91U208601","IP":"192.168.128.5","SerialNo":"91U208601"}'::jsonb),

('gs820', 'hardware', 'GS820', 'GS820',
 'GS820 network settings and remote file directory.',
 '{"Device active":true,"IP":"192.168.128.6","VISA name":"GS820","list dir":"GS820ROM/PROGRAM"}'::jsonb)

ON CONFLICT (id, group_name) DO NOTHING;

-- ── Module configs (software) ─────────────────────────────────────────────────
INSERT INTO module_configs (id, group_name, title, short_label, summary, config) VALUES
('gui', 'software', 'GUI', 'GUI.json',
 'GUI resources, visible controls, step tables and cable prompts.',
 '{"Top visible steps":0}'::jsonb),

('data-proc', 'software', 'Data Processing', 'DataProc.json',
 'RTO filtering and numeric precision for generated results.',
 '{"Results precision":{"Energy ":{"DUT":3,"Reference":3},"Applied Limit ":6,"Error Perc":3}}'::jsonb),

('lib-bl30', 'software', 'LibBL30', 'LibBL30.json',
 'BL30 init settings, REM102 connection and GS820 event defaults.',
 '{"ConnectREM102":{"IP (192.168.128.1)":"192.168.128.1","portNo (6020)":6020,"TimeOut (5000)":5000}}'::jsonb),

('file', 'software', 'File Paths', 'File.json',
 'Support, results, logs, calibration and RTO data paths.',
 '{"Support Dir":"D:\\\\SVN\\\\trunk\\\\REMview3.0\\\\Support","Results Dir":"D:\\\\SVN\\\\trunk\\\\REMview3.0\\\\Support\\\\Results"}'::jsonb),

('reporting', 'software', 'Reporting', 'Reporting.json',
 'Report templates, buffer paths and bookmark mappings.',
 '{"Paths":{"REM102":{"Report.buffer":"C:\\\\ProgramData\\\\HaslerRail\\\\REMview3.0\\\\03_Reports\\\\buffer"}}}'::jsonb),

('error-handler', 'software', 'Error Handler', 'ErrorHandler.json',
 'Error log target, filters and formatting support data.',
 '{"FileLog Path":"C:\\\\ProgramData\\\\HaslerRail\\\\RTPREMView\\\\04_Logs","Name":"RTPREMView_ErrorLog"}'::jsonb)

ON CONFLICT (id, group_name) DO NOTHING;
