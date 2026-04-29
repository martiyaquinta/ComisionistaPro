'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { ConsultationCard } from './consultation-card'
import { Input } from '@/components/ui/input'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import type { ConsultationStatus, ConsultationWithClient } from '@/lib/types'
import { Search, Inbox } from 'lucide-react'

type Filter = ConsultationStatus | 'all'

const TABS: { value: Filter; label: string }[] = [
  { value: 'all',       label: 'Todas'      },
  { value: 'pending',   label: 'Pendientes' },
  { value: 'quoted',    label: 'Cotizadas'  },
  { value: 'confirmed', label: 'Confirmadas'},
  { value: 'cancelled', label: 'Canceladas' },
]

export function ConsultationList({
  initial,
}: {
  initial: ConsultationWithClient[]
}) {
  const [consultations, setConsultations] = useState<ConsultationWithClient[]>(initial)
  const [filter, setFilter] = useState<Filter>('all')
  const [search, setSearch] = useState('')

  // ─── Supabase Realtime ────────────────────────────────────────────────────
  useEffect(() => {
    const supabase = createClient()

    const channel = supabase
      .channel('consultations-realtime')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'consultations' },
        async (payload) => {
          // Fetch consulta completa con cliente
          const { data } = await supabase
            .from('consultations')
            .select('*, client:clients(*)')
            .eq('id', payload.new.id)
            .single()

          if (data) {
            setConsultations(prev => [data as ConsultationWithClient, ...prev])
          }
        },
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'consultations' },
        async (payload) => {
          const { data } = await supabase
            .from('consultations')
            .select('*, client:clients(*)')
            .eq('id', payload.new.id)
            .single()

          if (data) {
            setConsultations(prev =>
              prev.map(c => (c.id === data.id ? (data as ConsultationWithClient) : c)),
            )
          }
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  // ─── Filtrado ──────────────────────────────────────────────────────────────
  const filtered = consultations.filter(c => {
    if (filter !== 'all' && c.status !== filter) return false
    if (!search) return true
    const q = search.toLowerCase()
    return (
      c.client.name?.toLowerCase().includes(q) ||
      c.client.phone.includes(q) ||
      c.origin?.toLowerCase().includes(q) ||
      c.destination?.toLowerCase().includes(q)
    )
  })

  const countByStatus = useCallback(
    (s: Filter) => (s === 'all' ? consultations.length : consultations.filter(c => c.status === s).length),
    [consultations],
  )

  return (
    <div className="space-y-4">
      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por cliente, teléfono, ciudad..."
            className="pl-9"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      </div>

      <Tabs value={filter} onValueChange={v => setFilter(v as Filter)}>
        <TabsList className="w-full justify-start overflow-x-auto">
          {TABS.map(({ value, label }) => (
            <TabsTrigger key={value} value={value} className="gap-1.5">
              {label}
              <span className="text-xs opacity-60">({countByStatus(value)})</span>
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {/* Lista */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-3">
          <Inbox className="w-10 h-10 opacity-30" />
          <p className="text-sm">Sin consultas{filter !== 'all' ? ` ${TABS.find(t => t.value === filter)?.label.toLowerCase()}` : ''}</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {filtered.map(c => (
            <ConsultationCard key={c.id} consultation={c} />
          ))}
        </div>
      )}
    </div>
  )
}
