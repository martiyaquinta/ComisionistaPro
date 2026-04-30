import { getDashboardStats, getConsultations } from '@/lib/supabase/queries'
import { StatsOverview } from '@/components/dashboard/stats-overview'
import { ConsultationList } from '@/components/dashboard/consultation-list'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function DashboardPage() {
  const [stats, consultations] = await Promise.all([
    getDashboardStats(),
    getConsultations(),
  ])

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Consultas</h1>
          <p className="text-sm text-muted-foreground">
            {stats.total} consulta{stats.total !== 1 ? 's' : ''} en total · actualización en tiempo real
          </p>
        </div>
      </div>

      {/* Stats */}
      <StatsOverview stats={stats} />

      {/* Lista con filtros + realtime */}
      <ConsultationList initial={consultations} />
    </div>
  )
}
