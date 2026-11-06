-- =============================================================================
-- Migration 2026-11-06 — Part specs (shared equipment types) + part documents
-- Run once in Supabase → SQL Editor. Safe to re-run.
-- =============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Equipment types / fields shared by assets and parts
--    applies_to: 'asset' | 'part' | 'both'   (existing rows become 'both')
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE asset_types        ADD COLUMN IF NOT EXISTS applies_to TEXT DEFAULT 'both';
ALTER TABLE asset_type_schemas ADD COLUMN IF NOT EXISTS applies_to TEXT DEFAULT 'both';
ALTER TABLE asset_type_schemas ADD COLUMN IF NOT EXISTS section    TEXT DEFAULT '';
ALTER TABLE asset_type_schemas ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0;

UPDATE asset_types        SET applies_to = 'both' WHERE applies_to IS NULL OR applies_to = '';
UPDATE asset_type_schemas SET applies_to = 'both' WHERE applies_to IS NULL OR applies_to = '';

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Parts: type + spec values (same key/value shape as assets.attrs)
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE parts ADD COLUMN IF NOT EXISTS part_type TEXT  DEFAULT '';
ALTER TABLE parts ADD COLUMN IF NOT EXISTS attrs     JSONB DEFAULT '{}';

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. Starter types (skipped if the code already exists)
-- ─────────────────────────────────────────────────────────────────────────────
INSERT INTO asset_types (type_code, label, icon, color, applies_to) VALUES
  ('MOTOR',        'Motor',        '⚙', 'blue',   'both'),
  ('VFD',          'VFD',          '🎛', 'purple', 'both'),
  ('SOFT_STARTER', 'Soft Starter', '🔌', 'indigo', 'both'),
  ('STARTER',      'Starter',      '🔌', 'slate',  'both'),
  ('SENSOR',       'Sensor',       '📡', 'green',  'both'),
  ('HEATER',       'Heater',       '🔥', 'red',    'both'),
  ('PANEL',        'Panel',        '🗄', 'amber',  'both')
ON CONFLICT (type_code) DO NOTHING;

-- Starter fields — only added to a type that has no fields yet
WITH seed(type_code, field_key, label, data_type, unit, options, section, sort_order) AS (VALUES
  ('MOTOR', 'hp',             'Power',          'number', 'HP',  '[]', 'Electrical', 10),
  ('MOTOR', 'voltage',        'Voltage',        'number', 'V',   '[]', 'Electrical', 20),
  ('MOTOR', 'fla',            'Full Load Amps', 'number', 'A',   '[]', 'Electrical', 30),
  ('MOTOR', 'phases',         'Phases',         'select', '',    '["1","3"]', 'Electrical', 40),
  ('MOTOR', 'service_factor', 'Service Factor', 'number', '',    '[]', 'Electrical', 50),
  ('MOTOR', 'efficiency',     'Efficiency',     'number', '%',   '[]', 'Electrical', 60),
  ('MOTOR', 'rpm',            'Speed',          'number', 'RPM', '[]', 'Mechanical', 70),
  ('MOTOR', 'frame',          'Frame',          'text',   '',    '[]', 'Mechanical', 80),
  ('MOTOR', 'enclosure',      'Enclosure',      'select', '',    '["TEFC","ODP","TENV","XP"]', 'Mechanical', 90),
  ('MOTOR', 'mounting',       'Mounting',       'select', '',    '["Foot","C-Face","D-Flange","Foot + C-Face"]', 'Mechanical', 100),

  ('VFD', 'hp',             'Power',             'number', 'HP', '[]', 'Electrical', 10),
  ('VFD', 'input_voltage',  'Input Voltage',     'number', 'V',  '[]', 'Electrical', 20),
  ('VFD', 'output_amps',    'Output Current',    'number', 'A',  '[]', 'Electrical', 30),
  ('VFD', 'phases',         'Input Phases',      'select', '',   '["1","3"]', 'Electrical', 40),
  ('VFD', 'enclosure',      'Enclosure',         'text',   '',   '[]', 'Mechanical', 50),
  ('VFD', 'comm_protocol',  'Comm. Protocol',    'select', '',   '["None","EtherNet/IP","Modbus TCP","Modbus RTU","Profinet","DeviceNet"]', 'Control', 60),
  ('VFD', 'brake_chopper',  'Brake Chopper',     'boolean','',   '[]', 'Control', 70),

  ('SOFT_STARTER', 'hp',            'Power',          'number', 'HP', '[]', 'Electrical', 10),
  ('SOFT_STARTER', 'voltage',       'Voltage',        'number', 'V',  '[]', 'Electrical', 20),
  ('SOFT_STARTER', 'rated_amps',    'Rated Current',  'number', 'A',  '[]', 'Electrical', 30),
  ('SOFT_STARTER', 'control_volts', 'Control Voltage','text',   '',   '[]', 'Control',    40),
  ('SOFT_STARTER', 'bypass',        'Built-in Bypass','boolean','',   '[]', 'Control',    50),

  ('STARTER', 'hp',             'Power',          'number', 'HP', '[]', 'Electrical', 10),
  ('STARTER', 'voltage',        'Voltage',        'number', 'V',  '[]', 'Electrical', 20),
  ('STARTER', 'rated_amps',     'Rated Current',  'number', 'A',  '[]', 'Electrical', 30),
  ('STARTER', 'coil_voltage',   'Coil Voltage',   'text',   '',   '[]', 'Control',    40),
  ('STARTER', 'overload_range', 'Overload Range', 'text',   'A',  '[]', 'Control',    50),
  ('STARTER', 'starter_type',   'Starter Type',   'select', '',   '["FVNR","FVR","2-Speed","Star-Delta"]', 'Control', 60),

  ('SENSOR', 'sensing_type',  'Sensing Type',   'select', '',  '["Inductive","Capacitive","Photoelectric","Ultrasonic","Temperature","Pressure","Level","Flow","Encoder"]', 'General', 10),
  ('SENSOR', 'range',         'Range',          'text',   '',  '[]', 'General',    20),
  ('SENSOR', 'output',        'Output',         'select', '',  '["PNP","NPN","4-20 mA","0-10 V","Relay","IO-Link"]', 'Electrical', 30),
  ('SENSOR', 'supply_voltage','Supply Voltage', 'text',   '',  '[]', 'Electrical', 40),
  ('SENSOR', 'connection',    'Connection',     'select', '',  '["M12 Connector","M8 Connector","Cable"]', 'Mechanical', 50),
  ('SENSOR', 'mounting',      'Thread / Mount', 'text',   '',  '[]', 'Mechanical', 60),

  ('HEATER', 'watts',        'Power',          'number', 'W',  '[]', 'Electrical', 10),
  ('HEATER', 'voltage',      'Voltage',        'number', 'V',  '[]', 'Electrical', 20),
  ('HEATER', 'phases',       'Phases',         'select', '',   '["1","3"]', 'Electrical', 30),
  ('HEATER', 'element_type', 'Element Type',   'select', '',   '["Cartridge","Strip","Tubular","Immersion","Band","Space Heater"]', 'Mechanical', 40),
  ('HEATER', 'sheath',       'Sheath Material','text',   '',   '[]', 'Mechanical', 50),
  ('HEATER', 'length',       'Length',         'text',   '',   '[]', 'Mechanical', 60),

  ('PANEL', 'voltage',      'Voltage',          'number', 'V',  '[]', 'Electrical', 10),
  ('PANEL', 'amps',         'Rated Current',    'number', 'A',  '[]', 'Electrical', 20),
  ('PANEL', 'main_breaker', 'Main Breaker',     'text',   '',   '[]', 'Electrical', 30),
  ('PANEL', 'enclosure',    'Enclosure Rating', 'select', '',   '["NEMA 1","NEMA 12","NEMA 4","NEMA 4X","IP54","IP65","IP66"]', 'Mechanical', 40),
  ('PANEL', 'dimensions',   'Dimensions',       'text',   '',   '[]', 'Mechanical', 50)
)
INSERT INTO asset_type_schemas (type_code, field_key, label, data_type, unit, required, options, section, sort_order, applies_to)
SELECT s.type_code, s.field_key, s.label, s.data_type, s.unit, false, s.options::jsonb, s.section, s.sort_order, 'both'
FROM seed s
WHERE NOT EXISTS (SELECT 1 FROM asset_type_schemas x WHERE x.type_code = s.type_code)
ON CONFLICT (type_code, field_key) DO NOTHING;

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. Part documents — uploaded files (Supabase Storage) or external links
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS part_documents (
  doc_id       BIGSERIAL PRIMARY KEY,
  part_id      TEXT NOT NULL REFERENCES parts(part_id) ON DELETE CASCADE,
  doc_type     TEXT DEFAULT 'Other',
  title        TEXT NOT NULL DEFAULT '',
  revision     TEXT DEFAULT '',
  kind         TEXT NOT NULL DEFAULT 'file',   -- 'file' | 'link'
  url          TEXT DEFAULT '',                -- link target (kind = 'link')
  storage_path TEXT DEFAULT '',                -- object path in bucket part-files (kind = 'file')
  file_name    TEXT DEFAULT '',
  file_size    BIGINT DEFAULT 0,
  mime_type    TEXT DEFAULT '',
  uploaded_by  TEXT DEFAULT '',
  created_at   TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS part_documents_part_id_idx ON part_documents(part_id);

ALTER TABLE part_documents ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "auth_all" ON part_documents;
CREATE POLICY "auth_all" ON part_documents FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Private bucket, 50 MB per file (Supabase free-plan maximum)
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('part-files', 'part-files', false, 52428800)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "part_files_select" ON storage.objects;
DROP POLICY IF EXISTS "part_files_insert" ON storage.objects;
DROP POLICY IF EXISTS "part_files_update" ON storage.objects;
DROP POLICY IF EXISTS "part_files_delete" ON storage.objects;
CREATE POLICY "part_files_select" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'part-files');
CREATE POLICY "part_files_insert" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'part-files');
CREATE POLICY "part_files_update" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'part-files');
CREATE POLICY "part_files_delete" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'part-files');
