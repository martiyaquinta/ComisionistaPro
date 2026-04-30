import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getPackage } from '@/lib/supabase/queries'
import { DetailForm } from '@/components/consultation/detail-form'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { StatusBadge } from '@/components/dashboard/status-badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { ArrowLeft, Phone, MessageCircle, MapPin, Calendar, Clock, Package } from 'lucide-react'

export const dynamic = 'force-dynamic'
export const revalidate = 0

function avatarColor(phone: string): string {
  const colors = ['bg-violet-500','bg-blue-500','bg-green-500','bg-orange-500','bg-pink-500','bg-teal-500']
  return colors[phone.split('').reduce((a,c) => a + c.charCodeAt(0), 0) % colors.length]
}

function initials(name: string | null, phone: string): string {
  if (name) return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
  return phone.slice(-2)
}

export default async function ConsultationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const pkg = await getPackage(id)
  if (!pkg) notFound()

  const { client } = pkg
  const displayName = client.name ?? client.phone
  const waLink = `https://wa.me/${client.phone.replace(/\D/g, '')}`

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center gap-4 px-6 py-4 border-b bg-card shrink-0">
        <Link href="/dashboard">
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
        <Avatar>
          <AvatarFallback className={`${avatarColor(client.phone)} text-white font-semibold`}>
            {initials(client.name, client.phone)}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="font-semibold truncate">{displayName}</h1>
            <StatusBadge status={pkg.status} />
          </div>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Phone className="w-3 h-3" />
            <span>{client.phone}</span>
          </div>
        </div>
        <a href={waLink} target="_blank" rel="noopener noreferrer">
          <Button size="sm" variant="outline" className="gap-1.5 text-green-600 border-green-200 hover:bg-green-50">
            <MessageCircle className="w-4 h-4" /> Abrir WhatsApp
          </Button>
        </a>
      </div>

      {/* Body */}
      <div className="flex flex-1 overflow-hidden">
        {/* Info del pedido */}
        <div className="flex-1 p-6 overflow-y-auto space-y-5">
          <div className="bg-muted/40 rounded-lg p-4 space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
              <Package className="w-3.5 h-3.5" /> Detalle del pedido
            </p>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-xs text-muted-foreground">Origen</p>
                <p className="font-medium">{pkg.origin_address ?? '—'}</p>
                <p className="text-xs text-muted-foreground">{[pkg.origin_city, pkg.origin_province].filter(Boolean).join(', ') || '—'}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Destino</p>
                <p className="font-medium">{pkg.destination_address ?? '—'}</p>
                <p className="text-xs text-muted-foreground">{[pkg.destination_city, pkg.destination_province].filter(Boolean).join(', ') || '—'}</p>
              </div>
            </div>
            <div className="flex gap-4 text-sm pt-1">
              {pkg.travel_date && (
                <span className="flex items-center gap-1 text-muted-foreground">
                  <Calendar className="w-3.5 h-3.5" /> {new Date(pkg.travel_date + 'T00:00:00').toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })}
                </span>
              )}
              {pkg.trip_type && (
                <span className="flex items-center gap-1 text-muted-foreground">
                  <MapPin className="w-3.5 h-3.5" /> {pkg.trip_type === 'HACIA_MAR_DEL_PLATA' ? 'Hacia Mar del Plata' : 'Desde Mar del Plata'}
                </span>
              )}
            </div>
          </div>

          {pkg.raw_message && (
            <div className="bg-muted/30 rounded-lg p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Mensaje original</p>
              <p className="text-sm italic text-muted-foreground">&ldquo;{pkg.raw_message}&rdquo;</p>
            </div>
          )}
        </div>

        {/* Panel lateral: formulario */}
        <div className="w-80 shrink-0 overflow-y-auto p-5 border-l">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-4">Gestionar pedido</p>
          <Separator className="mb-4" />
          <DetailForm consultation={pkg as any} />
        </div>
      </div>
    </div>
  )
}
