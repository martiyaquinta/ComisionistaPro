export type ConsultationStatus = 'pending' | 'quoted' | 'confirmed' | 'cancelled'
export type MessageDirection = 'inbound' | 'outbound'

export interface Client {
  id: string
  phone: string
  name: string | null
  email: string | null
  created_at: string
  updated_at: string
}

export interface Consultation {
  id: string
  client_id: string
  origin: string | null
  destination: string | null
  travel_date: string | null
  travel_time: string | null
  passengers: number
  status: ConsultationStatus
  notes: string | null
  raw_message: string | null
  created_at: string
  updated_at: string
}

export interface ConsultationWithClient extends Consultation {
  client: Client
}

export interface ConsultationWithMessages extends Consultation {
  client: Client
  messages: Message[]
}

export interface Message {
  id: string
  consultation_id: string | null
  client_id: string
  whatsapp_message_id: string | null
  direction: MessageDirection
  content: string
  created_at: string
}

export interface ParsedTripData {
  origin: string | null
  destination: string | null
  travel_date: string | null
  travel_time: string | null
  passengers: number
  client_name: string | null
}

export interface DashboardStats {
  total: number
  pending: number
  quoted: number
  confirmed: number
  cancelled: number
}

// WhatsApp Cloud API payload types
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
