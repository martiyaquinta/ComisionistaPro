import { Badge } from '@/components/ui/badge'
import type { ConsultationStatus } from '@/lib/types'

const CONFIG: Record<ConsultationStatus, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline'; className: string }> = {
  pending:   { label: 'Pendiente',  variant: 'outline',      className: 'border-yellow-400 text-yellow-600 dark:text-yellow-400' },
  quoted:    { label: 'Cotizada',   variant: 'outline',      className: 'border-blue-400 text-blue-600 dark:text-blue-400' },
  confirmed: { label: 'Confirmada', variant: 'default',      className: 'bg-green-500 hover:bg-green-600 text-white border-0' },
  cancelled: { label: 'Cancelada',  variant: 'destructive',  className: '' },
}

export function StatusBadge({ status }: { status: ConsultationStatus }) {
  const { label, variant, className } = CONFIG[status]
  return (
    <Badge variant={variant} className={className}>
      {label}
    </Badge>
  )
}
