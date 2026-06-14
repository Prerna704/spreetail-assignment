CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS citext;

DO $$ BEGIN
  CREATE TYPE currency_code AS ENUM ('INR', 'USD');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE split_type AS ENUM ('EQUAL', 'PERCENTAGE', 'EXACT');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE anomaly_type AS ENUM (
    'DUPLICATE_EXPENSE',
    'INVALID_DATE',
    'NEGATIVE_AMOUNT',
    'MISSING_MEMBER',
    'INVALID_CURRENCY',
    'SETTLEMENT_LOGGED_AS_EXPENSE',
    'MEMBER_INACTIVE_ON_EXPENSE_DATE',
    'INVALID_SPLIT_TOTAL',
    'BLANK_REQUIRED_FIELD'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE audit_action AS ENUM ('CREATE', 'UPDATE', 'DELETE', 'IMPORT', 'APPROVE_DUPLICATE_REMOVAL');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  email CITEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS groups (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  base_currency currency_code NOT NULL DEFAULT 'INR',
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS group_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id),
  join_date DATE NOT NULL DEFAULT CURRENT_DATE,
  leave_date DATE,
  role TEXT NOT NULL DEFAULT 'member',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT group_members_unique_active UNIQUE (group_id, user_id),
  CONSTRAINT valid_membership_dates CHECK (leave_date IS NULL OR leave_date >= join_date)
);

CREATE TABLE IF NOT EXISTS exchange_rates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  source_currency currency_code NOT NULL,
  target_currency currency_code NOT NULL,
  rate NUMERIC(18,8) NOT NULL CHECK (rate > 0),
  effective_date DATE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (source_currency, target_currency, effective_date)
);

CREATE TABLE IF NOT EXISTS expenses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'General',
  amount NUMERIC(14,2) NOT NULL CHECK (amount > 0),
  currency currency_code NOT NULL,
  base_amount NUMERIC(14,2) NOT NULL CHECK (base_amount > 0),
  exchange_rate NUMERIC(18,8) NOT NULL CHECK (exchange_rate > 0),
  expense_date DATE NOT NULL,
  paid_by UUID NOT NULL REFERENCES users(id),
  split_type split_type NOT NULL,
  source_import_id UUID,
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS expense_participants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  expense_id UUID NOT NULL REFERENCES expenses(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id),
  percentage NUMERIC(8,4),
  exact_amount NUMERIC(14,2),
  owed_base_amount NUMERIC(14,2) NOT NULL CHECK (owed_base_amount >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (expense_id, user_id)
);

CREATE TABLE IF NOT EXISTS settlements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  payer_id UUID NOT NULL REFERENCES users(id),
  receiver_id UUID NOT NULL REFERENCES users(id),
  amount NUMERIC(14,2) NOT NULL CHECK (amount > 0),
  currency currency_code NOT NULL,
  base_amount NUMERIC(14,2) NOT NULL CHECK (base_amount > 0),
  exchange_rate NUMERIC(18,8) NOT NULL CHECK (exchange_rate > 0),
  settlement_date DATE NOT NULL,
  note TEXT,
  is_settled BOOLEAN NOT NULL DEFAULT TRUE,
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS import_batches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  filename TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'COMPLETED',
  rows_total INTEGER NOT NULL DEFAULT 0,
  rows_imported INTEGER NOT NULL DEFAULT 0,
  rows_skipped INTEGER NOT NULL DEFAULT 0,
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS import_rows (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  import_batch_id UUID NOT NULL REFERENCES import_batches(id) ON DELETE CASCADE,
  row_number INTEGER NOT NULL,
  raw_data JSONB NOT NULL,
  normalized_data JSONB,
  action_taken TEXT NOT NULL,
  expense_id UUID REFERENCES expenses(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS import_anomalies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  import_row_id UUID NOT NULL REFERENCES import_rows(id) ON DELETE CASCADE,
  type anomaly_type NOT NULL,
  message TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'error',
  action_taken TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS duplicate_review_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  source_expense_id UUID NOT NULL REFERENCES expenses(id),
  duplicate_expense_id UUID NOT NULL REFERENCES expenses(id),
  status TEXT NOT NULL DEFAULT 'PENDING',
  requested_by UUID NOT NULL REFERENCES users(id),
  reviewed_by UUID REFERENCES users(id),
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  actor_id UUID REFERENCES users(id),
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  action audit_action NOT NULL,
  before_state JSONB,
  after_state JSONB,
  metadata JSONB NOT NULL DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_expenses_group_date ON expenses(group_id, expense_date) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_settlements_group_date ON settlements(group_id, settlement_date) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_group_members_dates ON group_members(group_id, user_id, join_date, leave_date);
CREATE INDEX IF NOT EXISTS idx_audit_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_import_rows_batch ON import_rows(import_batch_id);

DO $$ BEGIN
  ALTER TABLE expenses
  ADD CONSTRAINT expenses_source_import_fk
  FOREIGN KEY (source_import_id) REFERENCES import_batches(id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
