'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { StatusBadge } from '@/components/dashboard/status-badge'
import { Separator } from '@/components/ui/separator'
import type { ConsultationStatus, ConsultationWithMessages } from '@/lib/types'
import { MapPin, Calendar, Clock, Users, StickyNote, CheckCircle2, X, FileText } from 'lucide-react'

const STATUS_OPTIONS: { value: ConsultationStatus; label: string }[] = [
  { value: 'pending',   label: 'Pendiente'  },
  { value: 'quoted',    label: 'Cotizada'   },
  { value: 'confirmed', label: 'Confirmada' },
  { value: 'cancelled', label: 'Cancelada'  },
]

export function DetailForm({ consultation }: { consultation: ConsultationWithMessages }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [saved, setSaved] = useState(false)

  const [form, setForm] = useState({
    origin:      consultation.origin      ?? '',
    destination: consultation.destination ?? '',
    travel_date: consultation.travel_date ?? '',
    travel_time: consultation.travel_time ?? '',
    passengers:  String(consultation.passengers),
    status:      consultation.status,
    notes:       consultation.notes ?? '',
  })

  function set(field: string, value: string) {
    setForm(prev => ({ ...prev, [field]: value }))
    setSaved(false)
  }

  async function handleSave() {
    startTransition(async () => {
      await fetch(`/api/consultations/${consultation.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          passengers: parseInt(form.passengers) || 1,
          travel_date: form.travel_date || null,
          travel_time: form.travel_time || null,
          origin:      form.origin      || null,
          destination: form.destination || null,
          notes:       form.notes       || null,
        }),
      })
      setSaved(true)
      router.refresh()
    })
  }

  return (
    <div className="space-y-5">
      {/* Estado */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">Estado</span>
          <StatusBadge status={form.status as ConsultationStatus} />
        </div>
        <Select value={form.status} onValueChange={v => set('status', v)}>
          <SelectTrigger className="w-36 h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map(o => (
              <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Separator />

      {/* Ruta */}
      <div className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
          <MapPin className="w-3.5 h-3.5" /> Ruta
        </p>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="origin" className="text-xs">Origen</Label>
            <Input
              id="origin"
              placeholder="Ej: Buenos Aires"
              value={form.origin}
              onChange={e => set('origin', e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="destination" className="text-xs">Destino</Label>
            <Input
              id="destination"
              placeholder="Ej: Mendoza"
              value={form.destination}
              onChange={e => set('destination', e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Fecha y hora */}
      <div className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
          <Calendar className="w-3.5 h-3.5" /> Fecha y hora
        </p>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="travel_date" className="text-xs flex items-center gap-1">
              <Calendar className="w-3 h-3" /> Fecha
            </Label>
            <Input
              id="travel_date"
              type="date"
              value={form.travel_date}
              onChange={e => set('travel_date', e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="travel_time" className="text-xs flex items-center gap-1">
              <Clock className="w-3 h-3" /> Horario
            </Label>
            <Input
              id="travel_time"
              type="time"
              value={form.travel_time}
              onChange={e => set('travel_time', e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Pasajeros */}
      <div className="space-y-1.5">
        <Label htmlFor="passengers" className="text-xs flex items-center gap-1.5">
          <Users className="w-3 h-3" /> Pasajeros
        </Label>
        <Input
          id="passengers"
          type="number"
          min={1}
          max={50}
          value={form.passengers}
          onChange={e => set('passengers', e.target.value)}
          className="w-24"
        />
      </div>

      <Separator />

      {/* Notas */}
      <div className="space-y-1.5">
        <Label htmlFor="notes" className="text-xs flex items-center gap-1.5">
          <StickyNote className="w-3 h-3" /> Notas internas
        </Label>
        <Textarea
          id="notes"
          placeholder="Precio cotizado, preferencias del cliente, observaciones..."
          rows={4}
          value={form.notes}
          onChange={e => set('notes', e.target.value)}
        />
      </div>

      {/* Acciones */}
      <div className="flex gap-2">
        <Button
          className="flex-1"
          onClick={handleSave}
          disabled={isPending}
        >
          {isPending ? (
            'Guardando...'
          ) : saved ? (
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4" /> Guardado
            </span>
          ) : (
            <span className="flex items-center gap-1.5">
              <FileText className="w-4 h-4" /> Guardar cambios
            </span>
          )}
        </Button>
      </div>

      {/* Acciones rápidas de estado */}
      <div className="grid grid-cols-2 gap-2">
        <Button
          variant="outline"
          size="sm"
          className="text-green-600 border-green-200 hover:bg-green-50 dark:hover:bg-green-950/20"
          onClick={() => { set('status', 'confirmed'); }}
        >
          <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" /> Confirmar
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="text-red-500 border-red-200 hover:bg-red-50 dark:hover:bg-red-950/20"
          onClick={() => { set('status', 'cancelled'); }}
        >
          <X className="w-3.5 h-3.5 mr-1.5" /> Cancelar
        </Button>
      </div>
    </div>
  )
}
