import { createClient } from './server'
import type {
  Client,
  Consultation,
  ConsultationWithClient,
  ConsultationWithMessages,
  ConsultationStatus,
  DashboardStats,
  Message,
  ParsedTripData,
} from '@/lib/types'

// ─── Clients ──────────────────────────────────────────────────────────────────

export async function getOrCreateClient(phone: string, name?: string): Promise<Client> {
  const supabase = await createClient()

  const { data: existing } = await supabase
    .from('clients')
    .select('*')
    .eq('phone', phone)
    .single()

  if (existing) {
    if (name && !existing.name) {
      const { data: updated } = await supabase
        .from('clients')
        .update({ name })
        .eq('id', existing.id)
        .select()
        .single()
      return updated ?? existing
    }
    return existing
  }

  const { data: created, error } = await supabase
    .from('clients')
    .insert({ phone, name: name ?? null })
    .select()
    .single()

  if (error) throw new Error(`Error creando cliente: ${error.message}`)
  return created
}

export async function getClients(): Promise<Client[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('clients')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data ?? []
}

// ─── Consultations ────────────────────────────────────────────────────────────

export async function getConsultations(
  status?: ConsultationStatus,
): Promise<ConsultationWithClient[]> {
  const supabase = await createClient()

  let query = supabase
    .from('consultations')
    .select('*, client:clients(*)')
    .order('created_at', { ascending: false })

  if (status) query = query.eq('status', status)

  const { data, error } = await query
  if (error) throw error
  return (data ?? []) as ConsultationWithClient[]
}

export async function getConsultation(id: string): Promise<ConsultationWithMessages | null> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('consultations')
    .select('*, client:clients(*), messages(*)')
    .eq('id', id)
    .order('created_at', { referencedTable: 'messages', ascending: true })
    .single()

  if (error) return null
  return data as ConsultationWithMessages
}

export async function createConsultation(
  clientId: string,
  parsed: ParsedTripData,
  rawMessage: string,
): Promise<Consultation> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('consultations')
    .insert({
      client_id: clientId,
      origin: parsed.origin,
      destination: parsed.destination,
      travel_date: parsed.travel_date,
      travel_time: parsed.travel_time,
      passengers: parsed.passengers,
      raw_message: rawMessage,
      status: 'pending',
    })
    .select()
    .single()

  if (error) throw new Error(`Error creando consulta: ${error.message}`)
  return data
}

export async function updateConsultation(
  id: string,
  fields: Partial<
    Pick<
      Consultation,
      | 'origin'
      | 'destination'
      | 'travel_date'
      | 'travel_time'
      | 'passengers'
      | 'status'
      | 'notes'
    >
  >,
): Promise<Consultation> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('consultations')
    .update(fields)
    .eq('id', id)
    .select()
    .single()

  if (error) throw new Error(`Error actualizando consulta: ${error.message}`)
  return data
}

// ─── Messages ─────────────────────────────────────────────────────────────────

export async function createMessage(
  clientId: string,
  content: string,
  options: {
    consultationId?: string
    whatsappMessageId?: string
    direction?: 'inbound' | 'outbound'
  } = {},
): Promise<Message> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('messages')
    .insert({
      client_id: clientId,
      consultation_id: options.consultationId ?? null,
      whatsapp_message_id: options.whatsappMessageId ?? null,
      direction: options.direction ?? 'inbound',
      content,
    })
    .select()
    .single()

  if (error) throw new Error(`Error guardando mensaje: ${error.message}`)
  return data
}

export async function getMessages(consultationId: string): Promise<Message[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .eq('consultation_id', consultationId)
    .order('created_at', { ascending: true })
  if (error) throw error
  return data ?? []
}

// ─── Stats ────────────────────────────────────────────────────────────────────

export async function getDashboardStats(): Promise<DashboardStats> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('consultations')
    .select('status')

  if (error) throw error

  const stats: DashboardStats = { total: 0, pending: 0, quoted: 0, confirmed: 0, cancelled: 0 }
  for (const row of data ?? []) {
    stats.total++
    stats[row.status as ConsultationStatus]++
  }
  return stats
}
