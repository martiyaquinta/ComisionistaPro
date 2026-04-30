import { NextRequest, NextResponse } from 'next/server'
import { parsePackageMessage } from '@/lib/claude-parser'
import { parseWhatsAppMessage } from '@/lib/message-parser'
import { sendWhatsAppMessage } from '@/lib/whatsapp'
import { createPackage, getAvailableTrips, getTripByDateAndType, getOrCreateClient } from '@/lib/supabase/queries'
import type { WhatsAppWebhookPayload, ParsedPackage, TripType } from '@/lib/types'

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const mode      = searchParams.get('hub.mode')
  const token     = searchParams.get('hub.verify_token')
  const challenge = searchParams.get('hub.challenge')
  if (mode === 'subscribe' && token === process.env.WHATSAPP_VERIFY_TOKEN) {
    return new NextResponse(challenge, { status: 200 })
  }
  return NextResponse.json({ error: 'Verificación fallida' }, { status: 403 })
}

export async function POST(req: NextRequest) {
  let body: WhatsAppWebhookPayload
  try { body = await req.json() }
  catch { return NextResponse.json({ error: 'Body inválido' }, { status: 400 }) }
  try { await processWebhook(body) }
  catch (err) { console.error('[WhatsApp] Error:', err) }
  return NextResponse.json({ status: 'ok' }, { status: 200 })
}

async function processWebhook(payload: WhatsAppWebhookPayload) {
  if (payload.object !== 'whatsapp_business_account') return

  for (const entry of payload.entry) {
    for (const change of entry.changes) {
      if (change.field !== 'messages') continue
      const { messages, contacts } = change.value
      if (!messages?.length) continue

      for (const msg of messages) {
        if (msg.type !== 'text') continue
        const phone   = msg.from
        const content = msg.text.body
        const waName  = contacts?.find(c => c.wa_id === phone)?.profile?.name

        const client = await getOrCreateClient(phone, waName)
        const trips  = await getAvailableTrips()

        // Intentar Claude, fallback a regex
        let parsed: ParsedPackage
        try {
          parsed = await parsePackageMessage(content, trips)
        } catch (err) {
          console.warn('[WhatsApp] Claude no disponible, usando parser regex:', err)
          parsed = regexFallback(content)
        }

        if (parsed.cliente && !client.name) {
          await getOrCreateClient(phone, parsed.cliente)
        }

        // Buscar viaje disponible
        let tripId: string | null = null
        if (parsed.fecha && parsed.tipo_viaje) {
          const trip = await getTripByDateAndType(parsed.fecha, parsed.tipo_viaje as TripType)
          if (trip && trip.current_count < trip.max_capacity) tripId = trip.id
        }

        // Siempre guardar el pedido (completo o incompleto)
        await createPackage(client.id, parsed, content, tripId, msg.id)

        // Responder por WhatsApp
        const reply = parsed.respuesta_whatsapp || buildFallbackReply(parsed)
        if (reply) await sendWhatsAppMessage(phone, reply)

        console.log(`[WhatsApp] Pedido guardado para ${phone}`, { status: parsed.estado, incompleto: parsed.incompleto })
      }
    }
  }
}

function regexFallback(content: string): ParsedPackage {
  const text = content.toLowerCase()
  const hasMdp = /mar del plata|mdp|mardel/i.test(text)
  const isHacia = hasMdp && /a mar del plata|hasta mar del plata|hacia mar del plata|para mar del plata/i.test(text)
  const isDesde = hasMdp && /de mar del plata|desde mar del plata/i.test(text)
  const tipo_viaje: TripType | null = isHacia ? 'HACIA_MAR_DEL_PLATA' : isDesde ? 'DESDE_MAR_DEL_PLATA' : null

  // Fecha simple
  const mañana = /mañana/i.test(text)
  const hoy    = /hoy/i.test(text)
  const fecha  = hoy ? new Date().toISOString().split('T')[0]
                     : mañana ? new Date(Date.now() + 86400000).toISOString().split('T')[0]
                     : null

  // Ciudad de origen (primer ciudad mencionada que no sea MDP)
  const ciudadMatch = text.match(/desde\s+([a-záéíóúñ\s]+?)(?:\s+a\s|\s+hasta\s|,|$)/i)
  const origen_ciudad = ciudadMatch ? capitalize(ciudadMatch[1].trim()) : null

  const faltantes: string[] = []
  if (!origen_ciudad) faltantes.push('dirección de origen')
  if (!tipo_viaje)    faltantes.push('destino (¿hacia o desde Mar del Plata?)')
  if (!fecha)         faltantes.push('fecha')

  const incompleto = faltantes.length > 0

  return {
    cliente: null,
    origen: { direccion: null, ciudad: origen_ciudad, provincia: null },
    destino: { direccion: null, ciudad: tipo_viaje === 'HACIA_MAR_DEL_PLATA' ? 'Mar del Plata' : null, provincia: null },
    fecha,
    tipo_viaje,
    estado: 'PENDIENTE',
    motivo: incompleto ? `Faltan datos: ${faltantes.join(', ')}` : '',
    observaciones: '',
    incompleto,
    campos_faltantes: faltantes,
    respuesta_whatsapp: '',
  }
}

function buildFallbackReply(parsed: ParsedPackage): string {
  if (!parsed.incompleto && parsed.estado === 'CONFIRMADO') {
    return `¡Perfecto! Tu pedido quedó registrado para el ${parsed.fecha ?? 'la fecha acordada'}. Te confirmamos cuando esté asignado a un viaje. 📦`
  }
  if (parsed.incompleto && parsed.campos_faltantes.length > 0) {
    const faltantes = parsed.campos_faltantes.join(', ')
    return `Hola! Recibimos tu pedido 😊 Para poder registrarlo necesitamos que nos confirmes: *${faltantes}*. Gracias!`
  }
  return `Hola! Recibimos tu mensaje. En breve te respondemos. 🚐`
}

function capitalize(s: string) {
  return s.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
}
