'use client'

import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import type { Message } from '@/lib/types'
import { cn } from '@/lib/utils'

function formatTime(date: string) {
  return new Date(date).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })
}

function formatDay(date: string) {
  const d = new Date(date)
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(today.getDate() - 1)

  if (d.toDateString() === today.toDateString()) return 'Hoy'
  if (d.toDateString() === yesterday.toDateString()) return 'Ayer'
  return d.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })
}

export function MessageThread({
  consultationId,
  initialMessages,
  clientName,
  clientPhone,
}: {
  consultationId: string
  initialMessages: Message[]
  clientName: string | null
  clientPhone: string
}) {
  const [messages, setMessages] = useState<Message[]>(initialMessages)
  const bottomRef = useRef<HTMLDivElement>(null)

  // Scroll al último mensaje
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Realtime: nuevos mensajes
  useEffect(() => {
    const supabase = createClient()

    const channel = supabase
      .channel(`messages-${consultationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `consultation_id=eq.${consultationId}`,
        },
        (payload) => {
          setMessages(prev => [...prev, payload.new as Message])
        },
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [consultationId])

  // Agrupar mensajes por día
  const grouped = messages.reduce<{ day: string; msgs: Message[] }[]>((acc, msg) => {
    const day = formatDay(msg.created_at)
    const last = acc[acc.length - 1]
    if (last?.day === day) {
      last.msgs.push(msg)
    } else {
      acc.push({ day, msgs: [msg] })
    }
    return acc
  }, [])

  const display = clientName ?? clientPhone

  return (
    <ScrollArea className="flex-1 h-0">
      <div className="p-4 space-y-4">
        {grouped.map(({ day, msgs }) => (
          <div key={day} className="space-y-2">
            {/* Separador de día */}
            <div className="flex items-center gap-2 my-3">
              <div className="flex-1 h-px bg-border" />
              <span className="text-xs text-muted-foreground px-2">{day}</span>
              <div className="flex-1 h-px bg-border" />
            </div>

            {msgs.map(msg => {
              const isInbound = msg.direction === 'inbound'
              return (
                <div
                  key={msg.id}
                  className={cn('flex gap-2', isInbound ? 'justify-start' : 'justify-end')}
                >
                  {isInbound && (
                    <Avatar className="w-7 h-7 shrink-0 mt-1">
                      <AvatarFallback className="bg-violet-500 text-white text-xs">
                        {display.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  )}
                  <div
                    className={cn(
                      'max-w-[75%] rounded-2xl px-3.5 py-2 text-sm shadow-sm',
                      isInbound
                        ? 'bg-muted rounded-tl-none'
                        : 'bg-primary text-primary-foreground rounded-tr-none',
                    )}
                  >
                    <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                    <p
                      className={cn(
                        'text-[10px] mt-1 text-right',
                        isInbound ? 'text-muted-foreground' : 'text-primary-foreground/70',
                      )}
                    >
                      {formatTime(msg.created_at)}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        ))}

        {messages.length === 0 && (
          <p className="text-center text-sm text-muted-foreground py-8">Sin mensajes todavía</p>
        )}

        <div ref={bottomRef} />
      </div>
    </ScrollArea>
  )
}
