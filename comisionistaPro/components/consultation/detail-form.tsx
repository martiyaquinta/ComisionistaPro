'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { StatusBadge } from '@/components/dashboard/status-badge'
import { Separator } from '@/components/ui/separator'
import type { PackageStatus, PackageWithClient } from '@/lib/types'
import { CheckCircle2, X, FileText, StickyNote } from 'lucide-react'

const STATUS_OPTIONS: { value: PackageStatus; label: string }[] = [
  { value: 'PENDIENTE',  label: 'Pendiente'  },
  { value: 'CONFIRMADO', label: 'Confirmado' },
  { value: 'RECHAZADO',  label: 'Rechazado'  },
]

export function DetailForm({ consultation: pkg }: { consultation: PackageWithClient }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [saved, setSaved] = useState(false)
  const [status, setStatus] = useState<PackageStatus>(pkg.status)
  const [notes, setNotes]   = useState(pkg.notes ?? '')

  function handleStatusChange(v: string) { setStatus(v as PackageStatus); setSaved(false) }

  async function handleSave() {
    startTransition(async () => {
      await fetch(`/api/consultations/${pkg.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, notes: notes || null }),
      })
      setSaved(true)
      router.refresh()
    })
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">Estado</span>
          <StatusBadge status={status} />
        </div>
        <Select value={status} onValueChange={handleStatusChange}>
          <SelectTrigger className="w-36 h-8 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <Separator />

      <div className="space-y-1.5">
        <Label htmlFor="notes" className="text-xs flex items-center gap-1.5">
          <StickyNote className="w-3 h-3" /> Notas internas
        </Label>
        <Textarea
          id="notes"
          placeholder="Precio cotizado, aclaraciones, contacto..."
          rows={4}
          value={notes}
          onChange={e => { setNotes(e.target.value); setSaved(false) }}
        />
      </div>

      <Button className="w-full" onClick={handleSave} disabled={isPending}>
        {isPending ? 'Guardando...' : saved
          ? <span className="flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4" /> Guardado</span>
          : <span className="flex items-center gap-1.5"><FileText className="w-4 h-4" /> Guardar cambios</span>}
      </Button>

      <div className="grid grid-cols-2 gap-2">
        <Button variant="outline" size="sm" className="text-green-600 border-green-200 hover:bg-green-50"
          onClick={() => { setStatus('CONFIRMADO'); setSaved(false) }}>
          <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" /> Confirmar
        </Button>
        <Button variant="outline" size="sm" className="text-red-500 border-red-200 hover:bg-red-50"
          onClick={() => { setStatus('RECHAZADO'); setSaved(false) }}>
          <X className="w-3.5 h-3.5 mr-1.5" /> Rechazar
        </Button>
      </div>
    </div>
  )
}
