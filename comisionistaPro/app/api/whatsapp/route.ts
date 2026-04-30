import { NextRequest, NextResponse } from 'next/server'
import { parsePackageMessage } from '@/lib/claude-parser'
import { sendWhatsAppMessage } from '@/lib/whatsapp'
import { createPackage, getAvailableTrips, getTripByDateAndType, getOrCreateClient } from '@/lib/supabase/queries'
import type { WhatsAppWebhookPayload } from '@/lib/types'

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
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Body inválido' }, { status: 400 })
  }

  try {
    await processWebhook(body)
  } catch (err) {
    console.error('[WhatsApp] Error procesando webhook:', err)
  }

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

        // 1. Cliente
        const client = await getOrCreateClient(phone, waName)

        // 2. Viajes disponibles para pasarle contexto a Claude
        const viajesDisponibles = await getAvailableTrips()

        // 3. Claude parsea el mensaje
        const parsed = await parsePackageMessage(content, viajesDisponibles)

        // Actualizar nombre si Claude lo detectó
        if (parsed.cliente && !client.name) {
          await getOrCreateClient(phone, parsed.cliente)
        }

        // 4. Buscar viaje disponible si la fecha y tipo están claros
        let tripId: string | null = null

        if (parsed.fecha && parsed.tipo_viaje) {
          const trip = await getTripByDateAndType(parsed.fecha, parsed.tipo_viaje)
          if (trip && trip.current_count < trip.max_capacity) {
            tripId = trip.id
          }
        }

        // 5. Guardar pedido
        await createPackage(client.id, parsed, content, tripId, msg.id)

        // 6. Responder automáticamente por WhatsApp
        if (parsed.respuesta_whatsapp) {
          const sent = await sendWhatsAppMessage(phone, parsed.respuesta_whatsapp)
          console.log(`[WhatsApp] Respuesta enviada a ${phone}:`, sent)
        }

        console.log(`[WhatsApp] Pedido procesado para ${phone}:`, parsed)
      }
    }
  }
}
