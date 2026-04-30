import { Badge } from '@/components/ui/badge'
import type { PackageStatus } from '@/lib/types'

const CONFIG: Record<PackageStatus, { label: string; className: string }> = {
  PENDIENTE:  { label: 'Pendiente',  className: 'border-yellow-400 text-yellow-600 dark:text-yellow-400' },
  CONFIRMADO: { label: 'Confirmado', className: 'bg-green-500 hover:bg-green-600 text-white border-0' },
  RECHAZADO:  { label: 'Rechazado',  className: 'bg-red-500 hover:bg-red-600 text-white border-0' },
}

export function StatusBadge({ status }: { status: PackageStatus | string }) {
  const cfg = CONFIG[status as PackageStatus] ?? { label: status, className: '' }
  return <Badge variant="outline" className={cfg.className}>{cfg.label}</Badge>
}
