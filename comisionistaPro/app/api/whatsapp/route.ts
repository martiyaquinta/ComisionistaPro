import { NextRequest, NextResponse } from 'next/server'
import { parseWhatsAppMessage } from '@/lib/message-parser'
import { createConsultation, createMessage, getOrCreateClient } from '@/lib/supabase/queries'
import type { WhatsAppWebhookPayload } from '@/lib/types'

// ─── GET: Verificación del webhook (Meta lo llama una sola vez al registrar) ──
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const mode      = searchParams.get('hub.mode')
  const token     = searchParams.get('hub.verify_token')
  const challenge = searchParams.get('hub.challenge')

  if (mode === 'subscribe' && token === process.env.WHATSAPP_VERIFY_TOKEN) {
    console.log('[WhatsApp] Webhook verificado correctamente')
    return new NextResponse(challenge, { status: 200 })
  }

  return NextResponse.json({ error: 'Verificación fallida' }, { status: 403 })
}

// ─── POST: Recepción de mensajes entrantes ────────────────────────────────────
export async function POST(req: NextRequest) {
  let body: WhatsAppWebhookPayload

  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Body inválido' }, { status: 400 })
  }

  // Meta espera siempre 200 — de lo contrario reintenta
  try {
    await processWebhook(body)
  } catch (err) {
    console.error('[WhatsApp] Error procesando webhook:', err)
  }

  return NextResponse.json({ status: 'ok' }, { status: 200 })
}

// ─── Lógica principal ─────────────────────────────────────────────────────────

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

        // 1. Obtener o crear cliente
        const client = await getOrCreateClient(phone, waName)

        // 2. Parsear datos del viaje del mensaje
        const parsed = parseWhatsAppMessage(content)

        // Actualizar nombre si el parser lo detectó y no estaba en el perfil WA
        if (parsed.client_name && !client.name) {
          await getOrCreateClient(phone, parsed.client_name)
        }

        // 3. Crear consulta solo si hay al menos origen o destino
        let consultationId: string | undefined

        if (parsed.origin || parsed.destination) {
          const consultation = await createConsultation(client.id, parsed, content)
          consultationId = consultation.id
        }

        // 4. Guardar el mensaje en el hilo
        await createMessage(client.id, content, {
          consultationId,
          whatsappMessageId: msg.id,
          direction: 'inbound',
        })

        console.log(
          `[WhatsApp] Mensaje de ${phone} (${waName ?? 'desconocido'}) procesado.`,
          parsed,
        )
      }
    }
  }
}
