export interface ParsedOrder {
  origen: string | null
  destino: string | null
  fecha: string | null
  localidad: string | null
}

// Detecta si el mensaje tiene los campos estructurados
export function hasStructuredData(message: string): boolean {
  const upper = message.toUpperCase()
  return (
    (upper.includes('ORIGEN:') || upper.includes('ORIGEN :')) &&
    (upper.includes('DESTINO:') || upper.includes('DESTINO :'))
  )
}

// También detecta si el mensaje tiene datos suficientes en lenguaje natural
export function hasNaturalData(message: string): boolean {
  const lower = message.toLowerCase()
  const hasFecha = /\d{1,2}[\/\-]\d{1,2}|\d{1,2}\s+de\s+\w+|mañana|lunes|martes|miércoles|miercoles|jueves|viernes|sábado|sabado|domingo/i.test(message)
  const hasRuta  = /(?:de|desde|en)\s+\w+.+(?:a|hasta|para)\s+\w+/i.test(lower)
  return hasFecha && hasRuta
}

// Parsea el formato estructurado ORIGEN: / DESTINO: / FECHA: / LOCALIDAD:
export function parseStructuredMessage(message: string): ParsedOrder {
  const extract = (label: string): string | null => {
    const regex = new RegExp(`${label}\\s*:?\\s*(.+?)(?:\\n|ORIGEN|DESTINO|FECHA|LOCALIDAD|$)`, 'i')
    const m = message.match(regex)
    return m ? m[1].trim() : null
  }

  return {
    origen:    extract('ORIGEN'),
    destino:   extract('DESTINO'),
    fecha:     extract('FECHA'),
    localidad: extract('LOCALIDAD'),
  }
}

// Verifica qué campos faltan
export function getMissingFields(order: ParsedOrder): string[] {
  const missing: string[] = []
  if (!order.origen)    missing.push('ORIGEN')
  if (!order.destino)   missing.push('DESTINO')
  if (!order.fecha)     missing.push('FECHA')
  if (!order.localidad) missing.push('LOCALIDAD')
  return missing
}
