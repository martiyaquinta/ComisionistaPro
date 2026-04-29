import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getConsultation } from '@/lib/supabase/queries'
import { MessageThread } from '@/components/consultation/message-thread'
import { DetailForm } from '@/components/consultation/detail-form'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { StatusBadge } from '@/components/dashboard/status-badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { ArrowLeft, Phone, MessageCircle } from 'lucide-react'

export const dynamic = 'force-dynamic'
export const revalidate = 0

function avatarColor(phone: string): string {
  const colors = [
    'bg-violet-500', 'bg-blue-500', 'bg-green-500',
    'bg-orange-500', 'bg-pink-500', 'bg-teal-500',
  ]
  const idx = phone.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0) % colors.length
  return colors[idx]
}

function initials(name: string | null, phone: string): string {
  if (name) return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
  return phone.slice(-2)
}

export default async function ConsultationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const consultation = await getConsultation(id)

  if (!consultation) notFound()

  const { client, messages } = consultation
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
            <StatusBadge status={consultation.status} />
          </div>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Phone className="w-3 h-3" />
            <span>{client.phone}</span>
          </div>
        </div>

        <a href={waLink} target="_blank" rel="noopener noreferrer">
          <Button size="sm" variant="outline" className="gap-1.5 text-green-600 border-green-200 hover:bg-green-50 dark:hover:bg-green-950/20">
            <MessageCircle className="w-4 h-4" />
            Abrir WhatsApp
          </Button>
        </a>
      </div>

      {/* Body */}
      <div className="flex flex-1 overflow-hidden">
        {/* Hilo de mensajes */}
        <div className="flex-1 flex flex-col border-r overflow-hidden">
          <div className="px-4 py-2 border-b bg-muted/30 shrink-0">
            <p className="text-xs text-muted-foreground font-medium">
              Historial de mensajes · {messages.length} mensaje{messages.length !== 1 ? 's' : ''}
            </p>
          </div>
          <MessageThread
            consultationId={consultation.id}
            initialMessages={messages}
            clientName={client.name}
            clientPhone={client.phone}
          />
        </div>

        {/* Panel lateral: datos del viaje */}
        <div className="w-80 shrink-0 overflow-y-auto p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-4">
            Datos del viaje
          </p>
          <Separator className="mb-4" />
          <DetailForm consultation={consultation} />
        </div>
      </div>
    </div>
  )
}