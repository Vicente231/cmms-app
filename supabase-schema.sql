-- =============================================================================
-- CMMS App — Supabase SQL Schema
-- Paste this entire file into the Supabase SQL Editor and click Run.
-- =============================================================================

-- Sequences for string IDs (AST-000001 format)
CREATE SEQUENCE IF NOT EXISTS assets_seq START 1;
CREATE SEQUENCE IF NOT EXISTS work_orders_seq START 1;
CREATE SEQUENCE IF NOT EXISTS work_requests_seq START 1;
CREATE SEQUENCE IF NOT EXISTS pm_schedules_seq START 1;
CREATE SEQUENCE IF NOT EXISTS parts_seq START 1;
CREATE SEQUENCE IF NOT EXISTS inventory_seq START 1;
CREATE SEQUENCE IF NOT EXISTS projects_seq START 1;
CREATE SEQUENCE IF NOT EXISTS maintenance_tasks_seq START 1;
CREATE SEQUENCE IF NOT EXISTS work_order_tasks_seq START 1;
CREATE SEQUENCE IF NOT EXISTS wr_items_seq START 1;

-- ─────────────────────────────────────────────────────────────────────────────
-- PROFILES (extends Supabase auth.users)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS profiles (
  id       UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name     TEXT NOT NULL DEFAULT '',
  role     TEXT NOT NULL DEFAULT 'technician',
  email    TEXT DEFAULT '',
  avatar   TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Auto-create profile when a user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.profiles (id, name, role, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    'technician',
    NEW.email
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ─────────────────────────────────────────────────────────────────────────────
-- ASSET TYPES
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS asset_types (
  type_code TEXT PRIMARY KEY,
  label     TEXT NOT NULL DEFAULT '',
  icon      TEXT DEFAULT '',
  color     TEXT DEFAULT ''
);

CREATE TABLE IF NOT EXISTS asset_type_schemas (
  id        BIGSERIAL PRIMARY KEY,
  type_code TEXT NOT NULL,
  field_key TEXT NOT NULL,
  label     TEXT NOT NULL DEFAULT '',
  data_type TEXT DEFAULT 'text',
  unit      TEXT DEFAULT '',
  required  BOOLEAN DEFAULT false,
  options   JSONB DEFAULT '[]',
  UNIQUE(type_code, field_key)
);

-- ─────────────────────────────────────────────────────────────────────────────
-- ASSETS
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS assets (
  asset_id      TEXT PRIMARY KEY DEFAULT ('AST-' || LPAD(nextval('assets_seq')::text, 6, '0')),
  asset_name    TEXT NOT NULL DEFAULT '',
  asset_type    TEXT DEFAULT '',
  parent_asset  TEXT DEFAULT '',
  feed_from     TEXT DEFAULT '',
  location      TEXT DEFAULT '',
  criticality   TEXT DEFAULT 'MEDIUM',
  status        TEXT DEFAULT 'ACTIVE',
  manufacturer  TEXT DEFAULT '',
  vendor        TEXT DEFAULT '',
  part_number   TEXT DEFAULT '',
  serial_number TEXT DEFAULT '',
  install_date  TEXT DEFAULT '',
  warranty_expiry TEXT DEFAULT '',
  last_pm_date  TEXT DEFAULT '',
  notes         TEXT DEFAULT '',
  attrs         JSONB DEFAULT '{}',
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────────────────────
-- MAINTENANCE TASKS (templates)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS maintenance_tasks (
  task_id            TEXT PRIMARY KEY DEFAULT ('MT-' || LPAD(nextval('maintenance_tasks_seq')::text, 6, '0')),
  asset_type         TEXT DEFAULT '',
  description        TEXT NOT NULL DEFAULT '',
  frequency          TEXT DEFAULT '',
  safety             TEXT DEFAULT '',
  estimated_duration TEXT DEFAULT '',
  measurement_unit   TEXT DEFAULT '',
  pass_condition     TEXT DEFAULT '',
  measurement_fields TEXT DEFAULT '',
  created_at         TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────────────────────
-- PM SCHEDULES
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS pm_schedules (
  pm_id               TEXT PRIMARY KEY DEFAULT ('PM-' || LPAD(nextval('pm_schedules_seq')::text, 6, '0')),
  name                TEXT NOT NULL DEFAULT '',
  description         TEXT DEFAULT '',
  target_type         TEXT DEFAULT 'group',
  target_id           TEXT DEFAULT '',
  priority            TEXT DEFAULT 'MEDIUM',
  frequency_value     NUMERIC DEFAULT 1,
  frequency_unit      TEXT DEFAULT 'months',
  next_due_date       TEXT DEFAULT '',
  last_generated_date TEXT DEFAULT '',
  estimated_hours     NUMERIC DEFAULT NULL,
  is_active           BOOLEAN DEFAULT true,
  task_ids            TEXT DEFAULT '[]',
  created_date        TEXT DEFAULT '',
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────────────────────
-- WORK ORDERS
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS work_orders (
  wo_id               TEXT PRIMARY KEY DEFAULT ('WO-' || LPAD(nextval('work_orders_seq')::text, 6, '0')),
  wo_type             TEXT DEFAULT 'CM',
  asset_id            TEXT DEFAULT '',
  assigned_to         TEXT DEFAULT '',
  created_by          TEXT DEFAULT '',
  priority            TEXT DEFAULT 'MEDIUM',
  status              TEXT DEFAULT 'OPEN',
  due_date            TEXT DEFAULT '',
  estimated_duration  TEXT DEFAULT '',
  actual_duration     TEXT DEFAULT '',
  safety_condition    TEXT DEFAULT '',
  description         TEXT DEFAULT '',
  problem_description TEXT DEFAULT '',
  diagnosis           TEXT DEFAULT '',
  corrective_action   TEXT DEFAULT '',
  completion_notes    TEXT DEFAULT '',
  checklist           JSONB DEFAULT '[]',
  project_id          TEXT DEFAULT '',
  discipline          TEXT DEFAULT '',
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────────────────────
-- WORK ORDER TASKS
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS work_order_tasks (
  task_id             TEXT PRIMARY KEY DEFAULT ('WOT-' || LPAD(nextval('work_order_tasks_seq')::text, 6, '0')),
  wo_id               TEXT NOT NULL DEFAULT '',
  template_task_id    TEXT DEFAULT '',
  task_description    TEXT NOT NULL DEFAULT '',
  is_completed        BOOLEAN DEFAULT false,
  completion_notes    TEXT DEFAULT '',
  time_spent_minutes  NUMERIC DEFAULT NULL,
  measurement_value   TEXT DEFAULT '',
  created_at          TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────────────────────
-- WORK REQUESTS
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS work_requests (
  wr_id             TEXT PRIMARY KEY DEFAULT ('WR-' || LPAD(nextval('work_requests_seq')::text, 6, '0')),
  asset_id          TEXT DEFAULT '',
  asset_name        TEXT DEFAULT '',
  asset_location    TEXT DEFAULT '',
  description       TEXT NOT NULL DEFAULT '',
  priority          TEXT DEFAULT 'medium',
  requested_by      TEXT DEFAULT '',
  request_date      TEXT DEFAULT '',
  status            TEXT DEFAULT 'reported',
  converted_to_wo   TEXT DEFAULT '',
  image_urls        TEXT DEFAULT '[]',
  notes             TEXT DEFAULT '',
  department        TEXT DEFAULT '',
  contact_phone     TEXT DEFAULT '',
  request_type      TEXT DEFAULT '',
  failure_mode      TEXT DEFAULT '',
  machine_down      BOOLEAN DEFAULT false,
  production_impact TEXT DEFAULT '',
  safety_concern    BOOLEAN DEFAULT false,
  safety_detail     TEXT DEFAULT '',
  preferred_date    TEXT DEFAULT '',
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────────────────────
-- WORK REQUEST ITEMS
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS work_request_items (
  item_id     TEXT PRIMARY KEY DEFAULT ('WRI-' || LPAD(nextval('wr_items_seq')::text, 6, '0')),
  wr_id       TEXT NOT NULL DEFAULT '',
  item_type   TEXT DEFAULT 'part',
  description TEXT NOT NULL DEFAULT '',
  quantity    TEXT DEFAULT '',
  unit        TEXT DEFAULT '',
  supplier    TEXT DEFAULT '',
  status      TEXT DEFAULT 'pending',
  notes       TEXT DEFAULT '',
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────────────────────
-- PARTS
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS parts (
  part_id     TEXT PRIMARY KEY DEFAULT ('PRT-' || LPAD(nextval('parts_seq')::text, 6, '0')),
  part_number TEXT DEFAULT '',
  name        TEXT NOT NULL DEFAULT '',
  description TEXT DEFAULT '',
  category    TEXT DEFAULT '',
  unit        TEXT DEFAULT 'EA',
  unit_cost   NUMERIC DEFAULT 0,
  qty_on_hand NUMERIC DEFAULT 0,
  min_qty     NUMERIC DEFAULT 0,
  max_qty     NUMERIC DEFAULT 0,
  location    TEXT DEFAULT '',
  supplier    TEXT DEFAULT '',
  is_active   BOOLEAN DEFAULT true,
  notes       TEXT DEFAULT '',
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────────────────────
-- INVENTORY TRANSACTIONS
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS inventory_transactions (
  tx_id         TEXT PRIMARY KEY DEFAULT ('TX-' || LPAD(nextval('inventory_seq')::text, 6, '0')),
  part_id       TEXT NOT NULL DEFAULT '',
  part_name     TEXT DEFAULT '',
  part_number   TEXT DEFAULT '',
  tx_type       TEXT NOT NULL DEFAULT 'ADJUSTED',
  qty           NUMERIC NOT NULL DEFAULT 0,
  unit_cost     NUMERIC DEFAULT 0,
  balance_after NUMERIC DEFAULT 0,
  wo_id         TEXT DEFAULT '',
  reference     TEXT DEFAULT '',
  notes         TEXT DEFAULT '',
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────────────────────
-- PROJECTS
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS projects (
  project_id   TEXT PRIMARY KEY DEFAULT ('PRJ-' || LPAD(nextval('projects_seq')::text, 6, '0')),
  name         TEXT NOT NULL DEFAULT '',
  type         TEXT DEFAULT '',
  status       TEXT DEFAULT 'planning',
  planned_start TEXT DEFAULT '',
  planned_end   TEXT DEFAULT '',
  actual_start  TEXT DEFAULT '',
  actual_end    TEXT DEFAULT '',
  assets_scope  TEXT DEFAULT '',
  description   TEXT DEFAULT '',
  created_by    TEXT DEFAULT '',
  created_at    TEXT DEFAULT ''
);

-- =============================================================================
-- ROW LEVEL SECURITY
-- All authenticated users can read/write everything (adjust later if needed)
-- =============================================================================

ALTER TABLE profiles              ENABLE ROW LEVEL SECURITY;
ALTER TABLE assets                ENABLE ROW LEVEL SECURITY;
ALTER TABLE asset_types           ENABLE ROW LEVEL SECURITY;
ALTER TABLE asset_type_schemas    ENABLE ROW LEVEL SECURITY;
ALTER TABLE maintenance_tasks     ENABLE ROW LEVEL SECURITY;
ALTER TABLE pm_schedules          ENABLE ROW LEVEL SECURITY;
ALTER TABLE work_orders           ENABLE ROW LEVEL SECURITY;
ALTER TABLE work_order_tasks      ENABLE ROW LEVEL SECURITY;
ALTER TABLE work_requests         ENABLE ROW LEVEL SECURITY;
ALTER TABLE work_request_items    ENABLE ROW LEVEL SECURITY;
ALTER TABLE parts                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects              ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth_all" ON profiles              FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all" ON assets                FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all" ON asset_types           FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all" ON asset_type_schemas    FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all" ON maintenance_tasks     FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all" ON pm_schedules          FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all" ON work_orders           FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all" ON work_order_tasks      FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all" ON work_requests         FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all" ON work_request_items    FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all" ON parts                 FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all" ON inventory_transactions FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all" ON projects              FOR ALL TO authenticated USING (true) WITH CHECK (true);
