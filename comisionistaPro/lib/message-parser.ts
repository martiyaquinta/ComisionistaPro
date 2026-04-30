import type { ParsedTripData } from './types'

// ─── Mapas de meses en español ────────────────────────────────────────────────
const MONTHS: Record<string, string> = {
  enero: '01', ene: '01',
  febrero: '02', feb: '02',
  marzo: '03', mar: '03',
  abril: '04', abr: '04',
  mayo: '05',
  junio: '06', jun: '06',
  julio: '07', jul: '07',
  agosto: '08', ago: '08',
  septiembre: '09', sep: '09', sept: '09',
  octubre: '10', oct: '10',
  noviembre: '11', nov: '11',
  diciembre: '12', dic: '12',
}

const WEEKDAYS: Record<string, number> = {
  lunes: 1, martes: 2, miércoles: 3, miercoles: 3,
  jueves: 4, viernes: 5, sábado: 6, sabado: 6, domingo: 0,
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[¿¡]/g, '')
}

function nextWeekday(day: number): string {
  const today = new Date()
  const current = today.getDay()
  const diff = (day - current + 7) % 7 || 7
  const target = new Date(today)
  target.setDate(today.getDate() + diff)
  return target.toISOString().split('T')[0]
}

function tomorrowDate(): string {
  const d = new Date()
  d.setDate(d.getDate() + 1)
  return d.toISOString().split('T')[0]
}

function dayAfterTomorrowDate(): string {
  const d = new Date()
  d.setDate(d.getDate() + 2)
  return d.toISOString().split('T')[0]
}

// ─── Parsers individuales ─────────────────────────────────────────────────────

function parseRoute(text: string): { origin: string | null; destination: string | null } {
  const norm = normalize(text)

  // "de [origen] a [destino]" / "desde [origen] hasta [destino]"
  const patterns = [
    /(?:viaj(?:ar|o|e)|ir|viajar)\s+(?:de|desde)\s+([a-záéíóúüñ\s]+?)\s+(?:a|hacia|hasta|para)\s+([a-záéíóúüñ\s]+?)(?:\s+el\s|\s+para\s|\s+el\s+dia|\s+el\s+d[ií]a|\s*,|\s*\.|$)/,
    /(?:de|desde)\s+([a-záéíóúüñ\s]+?)\s+(?:a|hacia|hasta|para)\s+([a-záéíóúüñ\s]+?)(?:\s+el\s|\s+para\s|\s+\d|\s*,|\s*\.|$)/,
    /origen[:\s]+([a-záéíóúüñ\s]+?)[,\s]+destino[:\s]+([a-záéíóúüñ\s]+?)(?:\s*,|\s*\.|$)/,
  ]

  for (const pattern of patterns) {
    const m = norm.match(pattern)
    if (m) {
      return {
        origin: capitalize(m[1].trim()),
        destination: capitalize(m[2].trim()),
      }
    }
  }

  return { origin: null, destination: null }
}

function parseDate(text: string): string | null {
  const norm = normalize(text)

  // Relativo: mañana / pasado mañana
  if (/ma[nñ]ana/.test(norm) && !/pasado/.test(norm)) return tomorrowDate()
  if (/pasado\s+ma[nñ]ana/.test(norm)) return dayAfterTomorrowDate()

  // Próximo [weekday]
  for (const [name, dayNum] of Object.entries(WEEKDAYS)) {
    if (new RegExp(`pr[oó]ximo\\s+${name}`).test(norm)) {
      return nextWeekday(dayNum)
    }
  }

  // El [weekday] (sin "próximo")
  for (const [name, dayNum] of Object.entries(WEEKDAYS)) {
    if (new RegExp(`(?:el|este)\\s+${name}`).test(norm)) {
      return nextWeekday(dayNum)
    }
  }

  // [day] de [month] (de [year])
  const longDate = norm.match(
    /(\d{1,2})\s+de\s+(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|sept|octubre|noviembre|diciembre|ene|feb|mar|abr|jun|jul|ago|sep|oct|nov|dic)(?:\s+(?:de\s+)?(\d{4}))?/,
  )
  if (longDate) {
    const day = longDate[1].padStart(2, '0')
    const month = MONTHS[longDate[2]]
    const year = longDate[3] ?? new Date().getFullYear()
    return `${year}-${month}-${day}`
  }

  // DD/MM/YYYY o DD/MM/YY o DD/MM
  const shortDate = norm.match(/(\d{1,2})[\/\-](\d{1,2})(?:[\/\-](\d{2,4}))?/)
  if (shortDate) {
    const day = shortDate[1].padStart(2, '0')
    const month = shortDate[2].padStart(2, '0')
    let year = parseInt(shortDate[3] ?? String(new Date().getFullYear()))
    if (year < 100) year += 2000
    return `${year}-${month}-${day}`
  }

  return null
}

function parseTime(text: string): string | null {
  const norm = normalize(text)

  // a las HH:MM o a las HH
  const explicit = norm.match(/a\s+las?\s+(\d{1,2})(?::(\d{2}))?/)
  if (explicit) {
    const h = explicit[1].padStart(2, '0')
    const m = explicit[2] ?? '00'
    return `${h}:${m}`
  }

  // HH:MM standalone
  const standalone = norm.match(/\b(\d{1,2}):(\d{2})\b/)
  if (standalone) {
    return `${standalone[1].padStart(2, '0')}:${standalone[2]}`
  }

  // por la mañana / tarde / noche
  if (/por\s+la\s+ma[nñ]ana|de\s+ma[nñ]ana|temprano/.test(norm)) return '08:00'
  if (/por\s+la\s+tarde|de\s+tarde/.test(norm)) return '14:00'
  if (/por\s+la\s+noche|de\s+noche/.test(norm)) return '20:00'
  if (/mediodia|mediod[ií]a/.test(norm)) return '12:00'

  return null
}

function parsePassengers(text: string): number {
  const norm = normalize(text)

  const patterns = [
    /somos\s+(\d+)/,
    /para\s+(\d+)\s+(?:personas|pasajeros|pax|adultos)/,
    /(\d+)\s+(?:personas|pasajeros|pax|adultos)/,
    /para\s+(\d+)(?:\s|$)/,
  ]

  for (const p of patterns) {
    const m = norm.match(p)
    if (m) {
      const n = parseInt(m[1])
      if (n >= 1 && n <= 50) return n
    }
  }

  return 1
}

function parseClientName(text: string): string | null {
  const norm = normalize(text)

  const patterns = [
    /(?:soy|mi\s+nombre\s+es|me\s+llamo)\s+([a-záéíóúüñ]+(?:\s+[a-záéíóúüñ]+)?)/,
    /^hola[,!\s]+(?:soy\s+)?([a-záéíóúüñ]+(?:\s+[a-záéíóúüñ]+)?)[\s,]/,
  ]

  for (const p of patterns) {
    const m = norm.match(p)
    if (m && m[1].length > 1) return capitalize(m[1].trim())
  }

  return null
}

function capitalize(str: string): string {
  return str
    .split(' ')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
}

// ─── Parser principal ─────────────────────────────────────────────────────────

export function parseWhatsAppMessage(text: string): ParsedTripData {
  const { origin, destination } = parseRoute(text)

  return {
    cliente: parseClientName(text),
    origen: { direccion: null, ciudad: origin, provincia: null },
    destino: { direccion: null, ciudad: destination, provincia: null },
    travel_date: parseDate(text),
    fecha: parseDate(text),
    travel_time: parseTime(text),
    passengers: parsePassengers(text),
    client_name: parseClientName(text),
    tipo_viaje: null,
    estado: 'PENDIENTE',
    motivo: '',
    observaciones: '',
    incompleto: !origin || !destination,
    campos_faltantes: [],
    respuesta_whatsapp: '',
  } as unknown as ParsedTripData
}

// ─── Formato legible ──────────────────────────────────────────────────────────

export function formatTravelDate(date: string | null): string {
  if (!date) return 'Sin fecha'
  const d = new Date(date + 'T00:00:00')
  return d.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })
}

export function formatTravelTime(time: string | null): string {
  if (!time) return 'Sin horario'
  const [h, m] = time.split(':')
  return `${h}:${m} hs`
}
