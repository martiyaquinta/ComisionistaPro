import { NextRequest, NextResponse } from 'next/server'
import { updatePackage } from '@/lib/supabase/queries'

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params

  try {
    const body = await req.json()
    const updated = await updatePackage(id, {
      status: body.status,
      notes:  body.notes ?? null,
      reason: body.reason ?? null,
    })
    return NextResponse.json(updated)
  } catch (err) {
    console.error('[API] Error actualizando pedido:', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
