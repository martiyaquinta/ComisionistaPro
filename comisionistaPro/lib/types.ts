// ─── Clientes ─────────────────────────────────────────────────────────────────
export interface Client {
  id: string
  phone: string
  name: string | null
  email: string | null
  created_at: string
  updated_at: string
}

// ─── Viajes del día ───────────────────────────────────────────────────────────
export type TripType = 'HACIA_MAR_DEL_PLATA' | 'DESDE_MAR_DEL_PLATA'

export interface Trip {
  id: string
  date: string
  type: TripType
  max_capacity: number
  current_count: number
  notes: string | null
  created_at: string
}

// ─── Pedidos de encomiendas ───────────────────────────────────────────────────
export type PackageStatus = 'CONFIRMADO' | 'PENDIENTE' | 'RECHAZADO'

export interface Package {
  id: string
  client_id: string
  trip_id: string | null
  origin_address: string | null
  origin_city: string | null
  origin_province: string | null
  destination_address: string | null
  destination_city: string | null
  destination_province: string | null
  travel_date: string | null
  trip_type: TripType | null
  package_type: string | null
  status: PackageStatus
  reason: string | null
  notes: string | null
  raw_message: string | null
  wa_message_id: string | null
  wa_reply_sent: boolean
  created_at: string
  updated_at: string
}

export interface PackageWithClient extends Package {
  client: Client
  trip?: Trip | null
}

// ─── Salida del parser IA ─────────────────────────────────────────────────────
export interface ParsedPackage {
  cliente: string | null
  origen: { direccion: string | null; ciudad: string | null; provincia: string | null }
  destino: { direccion: string | null; ciudad: string | null; provincia: string | null }
  fecha: string | null
  tipo_viaje: TripType | null
  estado: PackageStatus
  motivo: string
  observaciones: string
  incompleto: boolean
  campos_faltantes: string[]
  respuesta_whatsapp: string
}

// ─── Stats ────────────────────────────────────────────────────────────────────
export interface DashboardStats {
  total: number
  pending: number
  confirmed: number
  rejected: number
}

// ─── WhatsApp Cloud API ───────────────────────────────────────────────────────
export interface WhatsAppTextMessage {
  id: string
  from: string
  timestamp: string
  type: 'text'
  text: { body: string }
}

export interface WhatsAppContact {
  profile: { name: string }
  wa_id: string
}

export interface WhatsAppWebhookPayload {
  object: string
  entry: Array<{
    id: string
    changes: Array<{
      value: {
        messaging_product: string
        contacts?: WhatsAppContact[]
        messages?: WhatsAppTextMessage[]
        statuses?: unknown[]
      }
      field: string
    }>
  }>
}

// ─── Aliases v1 → v2 (compatibilidad con componentes existentes) ──────────────
export type ConsultationStatus = PackageStatus
export type ConsultationWithClient = PackageWithClient
export type ConsultationWithMessages = PackageWithClient & { messages: Message[] }
export type Message = {
  id: string; consultation_id: string | null; client_id: string
  whatsapp_message_id: string | null; direction: 'inbound' | 'outbound'
  content: string; created_at: string
}
export type ParsedTripData = ParsedPackage
