import { Card, CardContent } from '@/components/ui/card'
import type { DashboardStats } from '@/lib/types'
import { Clock, CheckCircle2, FileText, XCircle } from 'lucide-react'

const STATS = [
  {
    key: 'pending' as const,
    label: 'Pendientes',
    icon: Clock,
    color: 'text-yellow-500',
    bg: 'bg-yellow-50 dark:bg-yellow-950/30',
  },
  {
    key: 'quoted' as const,
    label: 'Cotizadas',
    icon: FileText,
    color: 'text-blue-500',
    bg: 'bg-blue-50 dark:bg-blue-950/30',
  },
  {
    key: 'confirmed' as const,
    label: 'Confirmadas',
    icon: CheckCircle2,
    color: 'text-green-500',
    bg: 'bg-green-50 dark:bg-green-950/30',
  },
  {
    key: 'cancelled' as const,
    label: 'Canceladas',
    icon: XCircle,
    color: 'text-red-400',
    bg: 'bg-red-50 dark:bg-red-950/30',
  },
]

export function StatsOverview({ stats }: { stats: DashboardStats }) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {STATS.map(({ key, label, icon: Icon, color, bg }) => (
        <Card key={key}>
          <CardContent className="flex items-center gap-4 p-5">
            <div className={`${bg} p-2.5 rounded-lg`}>
              <Icon className={`w-5 h-5 ${color}`} />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats[key]}</p>
              <p className="text-xs text-muted-foreground">{label}</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
