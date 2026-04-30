'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { ConsultationCard } from './consultation-card'
import { Input } from '@/components/ui/input'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import type { PackageStatus, PackageWithClient } from '@/lib/types'
import { Search, Inbox } from 'lucide-react'

type Filter = PackageStatus | 'all'

const TABS: { value: Filter; label: string }[] = [
  { value: 'all',        label: 'Todos'       },
  { value: 'PENDIENTE',  label: 'Pendientes'  },
  { value: 'CONFIRMADO', label: 'Confirmados' },
  { value: 'RECHAZADO',  label: 'Rechazados'  },
]

export function ConsultationList({ initial }: { initial: PackageWithClient[] }) {
  const [items, setItems] = useState<PackageWithClient[]>(initial)
  const [filter, setFilter] = useState<Filter>('all')
  const [search, setSearch] = useState('')

  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel('packages-realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'packages' }, async (payload) => {
        const { data } = await supabase.from('packages').select('*, client:clients(*), trip:trips(*)').eq('id', payload.new.id).single()
        if (data) setItems(prev => [data as PackageWithClient, ...prev])
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'packages' }, async (payload) => {
        const { data } = await supabase.from('packages').select('*, client:clients(*), trip:trips(*)').eq('id', payload.new.id).single()
        if (data) setItems(prev => prev.map(p => p.id === data.id ? data as PackageWithClient : p))
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [])

  const filtered = items.filter(p => {
    if (filter !== 'all' && p.status !== filter) return false
    if (!search) return true
    const q = search.toLowerCase()
    return (
      p.client.name?.toLowerCase().includes(q) ||
      p.client.phone.includes(q) ||
      p.origin_city?.toLowerCase().includes(q) ||
      p.destination_city?.toLowerCase().includes(q)
    )
  })

  const countByFilter = useCallback(
    (f: Filter) => f === 'all' ? items.length : items.filter(p => p.status === f).length,
    [items],
  )

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input placeholder="Buscar por cliente, teléfono, ciudad..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      <Tabs value={filter} onValueChange={v => setFilter(v as Filter)}>
        <TabsList className="w-full justify-start">
          {TABS.map(({ value, label }) => (
            <TabsTrigger key={value} value={value} className="gap-1.5">
              {label} <span className="text-xs opacity-60">({countByFilter(value)})</span>
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-3">
          <Inbox className="w-10 h-10 opacity-30" />
          <p className="text-sm">Sin pedidos</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {filtered.map(p => <ConsultationCard key={p.id} consultation={p} />)}
        </div>
      )}
    </div>
  )
}
