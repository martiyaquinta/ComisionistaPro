import { createClient } from './server'
import type {
  Client,
  Package,
  PackageWithClient,
  PackageStatus,
  Trip,
  TripType,
  DashboardStats,
  ParsedPackage,
} from '@/lib/types'

export async function getOrCreateClient(phone: string, name?: string): Promise<Client> {
  const supabase = await createClient()
  const { data: existing } = await supabase.from('clients').select('*').eq('phone', phone).single()
  if (existing) {
    if (name && !existing.name) {
      const { data: updated } = await supabase.from('clients').update({ name }).eq('id', existing.id).select().single()
      return updated ?? existing
    }
    return existing
  }
  const { data, error } = await supabase.from('clients').insert({ phone, name: name ?? null }).select().single()
  if (error) throw new Error(`Error creando cliente: ${error.message}`)
  return data
}

export async function getAvailableTrips(fromDate?: string): Promise<Trip[]> {
  const supabase = await createClient()
  const today = new Date().toISOString().split('T')[0]
  const { data, error } = await supabase.from('trips').select('*').gte('date', fromDate ?? today).order('date', { ascending: true })
  if (error) throw error
  return data ?? []
}

export async function getTripByDateAndType(date: string, type: TripType): Promise<Trip | null> {
  const supabase = await createClient()
  const { data } = await supabase.from('trips').select('*').eq('date', date).eq('type', type).single()
  return data ?? null
}

export async function createTrip(date: string, type: TripType, maxCapacity = 5): Promise<Trip> {
  const supabase = await createClient()
  const { data, error } = await supabase.from('trips').insert({ date, type, max_capacity: maxCapacity }).select().single()
  if (error) throw new Error(`Error creando viaje: ${error.message}`)
  return data
}

export async function getPackages(status?: PackageStatus): Promise<PackageWithClient[]> {
  const supabase = await createClient()
  let query = supabase.from('packages').select('*, client:clients(*), trip:trips(*)').order('created_at', { ascending: false })
  if (status) query = query.eq('status', status)
  const { data, error } = await query
  if (error) throw error
  return (data ?? []) as PackageWithClient[]
}

export async function getPackage(id: string): Promise<PackageWithClient | null> {
  const supabase = await createClient()
  const { data } = await supabase.from('packages').select('*, client:clients(*), trip:trips(*)').eq('id', id).single()
  return (data as PackageWithClient) ?? null
}

export async function createPackage(clientId: string, parsed: ParsedPackage, rawMessage: string, tripId: string | null, waMessageId?: string): Promise<Package> {
  const supabase = await createClient()
  const { data, error } = await supabase.from('packages').insert({
    client_id: clientId, trip_id: tripId,
    origin_address: parsed.origen.direccion, origin_city: parsed.origen.ciudad, origin_province: parsed.origen.provincia,
    destination_address: parsed.destino.direccion, destination_city: parsed.destino.ciudad, destination_province: parsed.destino.provincia,
    travel_date: parsed.fecha, trip_type: parsed.tipo_viaje,
    status: parsed.estado, reason: parsed.motivo || null, notes: parsed.observaciones || null,
    raw_message: rawMessage, wa_message_id: waMessageId ?? null,
  }).select().single()
  if (error) throw new Error(`Error creando pedido: ${error.message}`)
  return data
}

export async function updatePackage(id: string, fields: Partial<Pick<Package, 'status' | 'trip_id' | 'notes' | 'reason' | 'wa_reply_sent'>>): Promise<Package> {
  const supabase = await createClient()
  const { data, error } = await supabase.from('packages').update(fields).eq('id', id).select().single()
  if (error) throw new Error(`Error actualizando pedido: ${error.message}`)
  return data
}

export async function getDashboardStats(): Promise<DashboardStats> {
  const supabase = await createClient()
  const { data } = await supabase.from('packages').select('status')
  const stats: DashboardStats = { total: 0, pending: 0, confirmed: 0, rejected: 0 }
  for (const row of data ?? []) {
    stats.total++
    if (row.status === 'PENDIENTE')  stats.pending++
    if (row.status === 'CONFIRMADO') stats.confirmed++
    if (row.status === 'RECHAZADO')  stats.rejected++
  }
  return stats
}

// ─── Aliases para compatibilidad con dashboard existente ──────────────────────
export const getConsultations = getPackages
export const getConsultation  = getPackage
