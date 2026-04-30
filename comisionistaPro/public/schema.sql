-- ComisionistaPRO — Schema Supabase
-- Ejecutar en: Supabase Dashboard > SQL Editor

-- ─── Clientes ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS clients (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  phone      TEXT UNIQUE NOT NULL,
  name       TEXT,
  email      TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Consultas de viaje ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS consultations (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id   UUID REFERENCES clients(id) ON DELETE CASCADE NOT NULL,
  origin      TEXT,
  destination TEXT,
  travel_date DATE,
  travel_time TIME,
  passengers  INTEGER DEFAULT 1,
  status      TEXT DEFAULT 'pending'
              CHECK (status IN ('pending', 'quoted', 'confirmed', 'cancelled')),
  notes       TEXT,
  raw_message TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Mensajes WhatsApp ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS messages (
  id                   UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  consultation_id      UUID REFERENCES consultations(id) ON DELETE SET NULL,
  client_id            UUID REFERENCES clients(id) ON DELETE CASCADE NOT NULL,
  whatsapp_message_id  TEXT UNIQUE,
  direction            TEXT DEFAULT 'inbound'
                       CHECK (direction IN ('inbound', 'outbound')),
  content              TEXT NOT NULL,
  created_at           TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Índices ─────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_consultations_client_id  ON consultations(client_id);
CREATE INDEX IF NOT EXISTS idx_consultations_status     ON consultations(status);
CREATE INDEX IF NOT EXISTS idx_consultations_created_at ON consultations(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_consultation_id ON messages(consultation_id);
CREATE INDEX IF NOT EXISTS idx_messages_client_id       ON messages(client_id);
CREATE INDEX IF NOT EXISTS idx_clients_phone            ON clients(phone);

-- ─── Trigger: updated_at automático ──────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER update_clients_updated_at
  BEFORE UPDATE ON clients
  FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

CREATE OR REPLACE TRIGGER update_consultations_updated_at
  BEFORE UPDATE ON consultations
  FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- ─── Row Level Security ───────────────────────────────────────────────────────
ALTER TABLE clients       ENABLE ROW LEVEL SECURITY;
ALTER TABLE consultations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages      ENABLE ROW LEVEL SECURITY;

-- Política abierta — el webhook usa service_role que bypassea RLS
CREATE POLICY "Allow all" ON clients       FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON consultations FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON messages      FOR ALL USING (true) WITH CHECK (true);

-- ─── Realtime ─────────────────────────────────────────────────────────────────
-- Habilitar en: Supabase > Database > Replication > Supabase Realtime
-- ALTER PUBLICATION supabase_realtime ADD TABLE consultations;
-- ALTER PUBLICATION supabase_realtime ADD TABLE messages;
