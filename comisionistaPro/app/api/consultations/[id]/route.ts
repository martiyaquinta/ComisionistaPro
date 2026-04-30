import { NextRequest, NextResponse } from 'next/server'
import { updateConsultation } from '@/lib/supabase/queries'

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params

  try {
    const body = await req.json()
    const updated = await updateConsultation(id, {
      origin:      body.origin      ?? null,
      destination: body.destination ?? null,
      travel_date: body.travel_date ?? null,
      travel_time: body.travel_time ?? null,
      passengers:  body.passengers  ?? 1,
      status:      body.status,
      notes:       body.notes       ?? null,
    })
    return NextResponse.json(updated)
  } catch (err) {
    console.error('[API] Error actualizando consulta:', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
