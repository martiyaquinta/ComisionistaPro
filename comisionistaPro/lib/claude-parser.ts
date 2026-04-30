import Anthropic from '@anthropic-ai/sdk'
import type { ParsedPackage, Trip } from './types'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const SYSTEM_PROMPT = `Sos un asistente inteligente integrado en la app ComisionistaPro. Tu función es procesar mensajes entrantes de WhatsApp de clientes que quieren enviar encomiendas hacia Mar del Plata o desde Mar del Plata.

OBJETIVOS:
1. Analizar el mensaje del cliente y extraer:
   - Nombre del cliente (si está disponible)
   - Dirección de origen (calle, número)
   - Dirección de destino (calle, número)
   - Ciudad y provincia de origen
   - Ciudad y provincia de destino
   - Fecha solicitada (convertir a formato YYYY-MM-DD, hoy es ${new Date().toISOString().split('T')[0]})
   - Tipo de paquete (si lo menciona)
   - Observaciones adicionales

2. Determinar el tipo de viaje:
   - "HACIA_MAR_DEL_PLATA": el destino es Mar del Plata o zona
   - "DESDE_MAR_DEL_PLATA": el origen es Mar del Plata o zona

3. Si falta información clave (dirección origen/destino o fecha), marcar como incompleto.

4. Generar una respuesta corta para WhatsApp (español informal, tono cercano, sin tecnicismos).

IMPORTANTE:
- No inventar datos críticos si no están en el mensaje
- Si hay duda sobre la fecha, marcarla como null
- "mañana" = ${new Date(Date.now() + 86400000).toISOString().split('T')[0]}
- Mar del Plata puede aparecer como "MDP", "Mardel", "Mar del Plata"

Respondé ÚNICAMENTE con un JSON válido, sin texto adicional, con esta estructura exacta:
{
  "cliente": "nombre o null",
  "origen": { "direccion": "string o null", "ciudad": "string o null", "provincia": "string o null" },
  "destino": { "direccion": "string o null", "ciudad": "string o null", "provincia": "string o null" },
  "fecha": "YYYY-MM-DD o null",
  "tipo_viaje": "HACIA_MAR_DEL_PLATA | DESDE_MAR_DEL_PLATA | null",
  "estado": "CONFIRMADO | PENDIENTE | RECHAZADO",
  "motivo": "string",
  "observaciones": "string",
  "incompleto": true | false,
  "campos_faltantes": ["lista de campos que faltan"],
  "respuesta_whatsapp": "mensaje listo para enviar"
}`

export async function parsePackageMessage(
  message: string,
  viajes_del_dia: Trip[],
): Promise<ParsedPackage> {
  const viajesContext = viajes_del_dia.length
    ? `\nViajes disponibles hoy y próximos días:\n${JSON.stringify(
        viajes_del_dia.map(v => ({
          fecha: v.date,
          tipo: v.type,
          disponibles: v.max_capacity - v.current_count,
          capacidad_max: v.max_capacity,
        })),
        null,
        2,
      )}`
    : '\nNo hay viajes programados actualmente.'

  const response = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 1024,
    system: SYSTEM_PROMPT + viajesContext,
    messages: [{ role: 'user', content: message }],
  })

  const raw = response.content[0].type === 'text' ? response.content[0].text : '{}'

  // Extraer JSON aunque venga con texto extra
  const jsonMatch = raw.match(/\{[\s\S]*\}/)
  if (!jsonMatch) throw new Error('Claude no devolvió JSON válido')

  return JSON.parse(jsonMatch[0]) as ParsedPackage
}
