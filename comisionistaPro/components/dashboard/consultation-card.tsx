import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { StatusBadge } from './status-badge'
import type { PackageWithClient } from '@/lib/types'
import { MapPin, Calendar, Package } from 'lucide-react'

function timeAgo(date: string): string {
  const diff = Date.now() - new Date(date).getTime()
  const mins = Math.floor(diff / 60_000)
  if (mins < 1) return 'ahora'
  if (mins < 60) return `hace ${mins}m`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `hace ${hours}h`
  return `hace ${Math.floor(hours / 24)}d`
}

function initials(name: string | null, phone: string): string {
  if (name) return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
  return phone.slice(-2)
}

function avatarColor(phone: string): string {
  const colors = ['bg-violet-500','bg-blue-500','bg-green-500','bg-orange-500','bg-pink-500','bg-teal-500']
  return colors[phone.split('').reduce((a,c) => a + c.charCodeAt(0), 0) % colors.length]
}

export function ConsultationCard({ consultation: pkg }: { consultation: PackageWithClient }) {
  const { client } = pkg
  const displayName = client.name ?? client.phone
  const origin = [pkg.origin_address, pkg.origin_city].filter(Boolean).join(', ')
  const destination = [pkg.destination_address, pkg.destination_city].filter(Boolean).join(', ')

  return (
    <Link href={`/dashboard/consulta/${pkg.id}`}>
      <Card className="hover:shadow-md hover:border-primary/30 transition-all cursor-pointer group">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Avatar className="shrink-0">
              <AvatarFallback className={`${avatarColor(client.phone)} text-white text-xs font-semibold`}>
                {initials(client.name, client.phone)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-medium text-sm truncate group-hover:text-primary transition-colors">{displayName}</p>
                  <p className="text-xs text-muted-foreground">{client.phone}</p>
                </div>
                <div className="flex flex-col items-end gap-1.5 shrink-0">
                  <StatusBadge status={pkg.status} />
                  <span className="text-xs text-muted-foreground">{timeAgo(pkg.created_at)}</span>
                </div>
              </div>

              {(origin || destination) && (
                <div className="flex items-center gap-1.5 mt-2 text-sm">
                  <MapPin className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                  <span className="font-medium truncate">
                    {origin || '?'} <span className="text-muted-foreground">→</span> {destination || '?'}
                  </span>
                </div>
              )}

              <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground">
                {pkg.travel_date && (
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {new Date(pkg.travel_date + 'T00:00:00').toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })}
                  </span>
                )}
                {pkg.trip_type && (
                  <span className="flex items-center gap-1">
                    <Package className="w-3 h-3" />
                    {pkg.trip_type === 'HACIA_MAR_DEL_PLATA' ? '→ MDP' : '← MDP'}
                  </span>
                )}
              </div>

              {pkg.raw_message && (
                <p className="mt-2 text-xs text-muted-foreground bg-muted/50 rounded px-2 py-1 truncate italic">
                  &ldquo;{pkg.raw_message}&rdquo;
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}
