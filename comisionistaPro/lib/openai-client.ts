import OpenAI from 'openai'
import type { ParsedOrder } from './utils/messageFilter'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

export async function generateConfirmationMessage(order: ParsedOrder): Promise<string> {
  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    max_tokens: 150,
    messages: [
      {
        role: 'system',
        content: `Sos el asistente de ComisionistaPRO, un servicio de encomiendas hacia/desde Mar del Plata.
Escribís mensajes de WhatsApp cortos, cálidos y profesionales en español argentino informal.
Cuando recibís un pedido confirmado, generás un mensaje de agradecimiento que incluye un resumen del pedido.
Máximo 3 líneas. Terminá siempre con "Muchas gracias por tener en cuenta a ComisionistaPRO 🚐📦"`,
      },
      {
        role: 'user',
        content: `Pedido confirmado:\n- Origen: ${order.origen}\n- Destino: ${order.destino}\n- Fecha: ${order.fecha}\n- Localidad: ${order.localidad}`,
      },
    ],
  })

  return completion.choices[0]?.message?.content?.trim() ??
    'Muchas gracias por tener en cuenta a ComisionistaPRO 🚐📦'
}
