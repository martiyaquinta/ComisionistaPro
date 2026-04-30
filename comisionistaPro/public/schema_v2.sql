-- ComisionistaPRO v2 — Encomiendas hacia/desde Mar del Plata
-- Ejecutar en: Supabase Dashboard > SQL Editor

-- ─── Viajes del día ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS trips (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  date          DATE NOT NULL,
  type          TEXT NOT NULL CHECK (type IN ('HACIA_MAR_DEL_PLATA', 'DESDE_MAR_DEL_PLATA')),
  max_capacity  INTEGER DEFAULT 5,
  current_count INTEGER DEFAULT 0,
  notes         TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(date, type)
);

-- ─── Pedidos de encomiendas ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS packages (
  id                   UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id            UUID REFERENCES clients(id) ON DELETE CASCADE NOT NULL,
  trip_id              UUID REFERENCES trips(id) ON DELETE SET NULL,
  origin_address       TEXT,
  origin_city          TEXT,
  origin_province      TEXT,
  destination_address  TEXT,
  destination_city     TEXT,
  destination_province TEXT,
  travel_date          DATE,
  trip_type            TEXT CHECK (trip_type IN ('HACIA_MAR_DEL_PLATA', 'DESDE_MAR_DEL_PLATA')),
  package_type         TEXT,
  status               TEXT DEFAULT 'PENDIENTE'
                       CHECK (status IN ('CONFIRMADO', 'PENDIENTE', 'RECHAZADO')),
  reason               TEXT,
  notes                TEXT,
  raw_message          TEXT,
  wa_message_id        TEXT UNIQUE,
  wa_reply_sent        BOOLEAN DEFAULT FALSE,
  created_at           TIMESTAMPTZ DEFAULT NOW(),
  updated_at           TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Índices ──────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_packages_client_id  ON packages(client_id);
CREATE INDEX IF NOT EXISTS idx_packages_trip_id    ON packages(trip_id);
CREATE INDEX IF NOT EXISTS idx_packages_status     ON packages(status);
CREATE INDEX IF NOT EXISTS idx_packages_created_at ON packages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_trips_date_type     ON trips(date, type);

-- ─── Trigger updated_at ───────────────────────────────────────────────────────
CREATE OR REPLACE TRIGGER update_packages_updated_at
  BEFORE UPDATE ON packages
  FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- ─── RLS ─────────────────────────────────────────────────────────────────────
ALTER TABLE trips    ENABLE ROW LEVEL SECURITY;
ALTER TABLE packages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all" ON trips    FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON packages FOR ALL USING (true) WITH CHECK (true);

-- ─── Realtime ─────────────────────────────────────────────────────────────────
-- ALTER PUBLICATION supabase_realtime ADD TABLE packages;
-- ALTER PUBLICATION supabase_realtime ADD TABLE trips;
