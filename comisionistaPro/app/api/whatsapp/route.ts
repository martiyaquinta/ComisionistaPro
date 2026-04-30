import { NextRequest, NextResponse } from 'next/server'
import { sendWhatsAppMessage } from '@/lib/whatsapp'
import { generateConfirmationMessage } from '@/lib/openai-client'
import { hasStructuredData, parseStructuredMessage, getMissingFields } from '@/lib/utils/messageFilter'
import { getOrCreateClient, createPackage, getConversationState, setConversationState } from '@/lib/supabase/queries'
import type { WhatsAppWebhookPayload, ParsedPackage } from '@/lib/types'

const MSG_WELCOME = `¡Hola! 👋 ComisionistaPRO a sus órdenes!

Indicame los siguientes datos y enseguida te atiendo:

*ORIGEN:* calle y altura
*DESTINO:* calle y altura
*FECHA:* (ej: 05/05/2026)
*LOCALIDAD:* ciudad

Ejemplo:
ORIGEN: San Martín 123
DESTINO: Independencia 456
FECHA: 05/05/2026
LOCALIDAD: Tandil`

const MSG_RETRY = `No pude entender bien los datos 😅

Mandalos en este formato:

*ORIGEN:* 
*DESTINO:* 
*FECHA:* 
*LOCALIDAD:* `

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const mode = searchParams.get('hub.mode')
  const token = searchParams.get('hub.verify_token')
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
        const phone  = msg.from
        const content = msg.text.body.trim()
        const waName  = contacts?.find(c => c.wa_id === phone)?.profile?.name

        const client = await getOrCreateClient(phone, waName)
        const state  = await getConversationState(client.id)

        // 1. Sin estado previo
        if (!state) {
          if (hasStructuredData(content)) {
            await handleOrderData(client.id, phone, content, msg.id)
          } else {
            await setConversationState(client.id, 'WAITING_FORMAT')
            await sendWhatsAppMessage(phone, MSG_WELCOME)
          }
          continue
        }

        // 2. Esperando datos
        if (state === 'WAITING_FORMAT') {
          if (hasStructuredData(content)) {
            await handleOrderData(client.id, phone, content, msg.id)
          } else {
            await sendWhatsAppMessage(phone, MSG_RETRY)
          }
          continue
        }

        // 3. Pedido ya procesado → nuevo pedido
        if (state === 'DONE') {
          await setConversationState(client.id, 'WAITING_FORMAT')
          await sendWhatsAppMessage(phone, MSG_WELCOME)
        }
      }
    }
  }
}

async function handleOrderData(clientId: string, phone: string, content: string, msgId: string) {
  const order   = parseStructuredMessage(content)
  const missing = getMissingFields(order)

  if (missing.length > 0) {
    const msg = `Faltan algunos datos 🙏 Completá:\n\n${missing.map(f => `*${f}:*`).join('\n')}`
    await sendWhatsAppMessage(phone, msg)
    return
  }

  const parsed: ParsedPackage = {
    cliente:      null,
    origen:       { direccion: order.origen, ciudad: order.localidad, provincia: null },
    destino:      { direccion: order.destino, ciudad: null, provincia: null },
    fecha:        parseFecha(order.fecha!),
    tipo_viaje:   detectTipoViaje(order.destino ?? '', order.origen ?? ''),
    estado:       'CONFIRMADO',
    motivo:       '',
    observaciones: order.localidad ?? '',
    incompleto:   false,
    campos_faltantes: [],
    respuesta_whatsapp: '',
  }

  await createPackage(clientId, parsed, content, null, msgId)
  await setConversationState(clientId, 'DONE')

  let reply: string
  try {
    reply = await generateConfirmationMessage(order)
  } catch {
    reply = `¡Pedido registrado! ✅\n\n📍 ${order.origen} → ${order.destino}\n📅 ${order.fecha} · ${order.localidad}\n\nMuchas gracias por tener en cuenta a ComisionistaPRO 🚐📦`
  }

  await sendWhatsAppMessage(phone, reply)
}

function parseFecha(fecha: string): string | null {
  const m = fecha.match(/(\d{1,2})[\/\-](\d{1,2})(?:[\/\-](\d{2,4}))?/)
  if (!m) return null
  const d = m[1].padStart(2, '0')
  const mo = m[2].padStart(2, '0')
  let y = parseInt(m[3] ?? String(new Date().getFullYear()))
  if (y < 100) y += 2000
  return `${y}-${mo}-${d}`
}

function detectTipoViaje(destino: string, origen: string) {
  if (/mar del plata|mdp|mardel/i.test(destino)) return 'HACIA_MAR_DEL_PLATA' as const
  if (/mar del plata|mdp|mardel/i.test(origen))  return 'DESDE_MAR_DEL_PLATA' as const
  return null
}
