import { NextRequest, NextResponse } from 'next/server'
import { getTermById, updateTerm, deleteTerm } from '@/lib/db'

type RouteContext = {
  params: Promise<{ id: string }>
}

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params
    const numId = parseInt(id, 10)
    if (isNaN(numId)) {
      return NextResponse.json({ error: 'Invalid ID' }, { status: 400 })
    }

    const term = getTermById(numId)
    if (!term) {
      return NextResponse.json({ error: 'Term not found' }, { status: 404 })
    }

    return NextResponse.json({ term })
  } catch (error) {
    console.error('Failed to get term:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params
    const numId = parseInt(id, 10)
    if (isNaN(numId)) {
      return NextResponse.json({ error: 'Invalid ID' }, { status: 400 })
    }

    const body = await request.json()
    const updated = updateTerm(numId, body)
    if (!updated) {
      return NextResponse.json({ error: 'Term not found' }, { status: 404 })
    }

    return NextResponse.json({ success: true, term: updated })
  } catch (error) {
    console.error('Failed to update term:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params
    const numId = parseInt(id, 10)
    if (isNaN(numId)) {
      return NextResponse.json({ error: 'Invalid ID' }, { status: 400 })
    }

    const deleted = deleteTerm(numId)
    if (!deleted) {
      return NextResponse.json({ error: 'Term not found' }, { status: 404 })
    }

    return NextResponse.json({ success: true, id: numId })
  } catch (error) {
    console.error('Failed to delete term:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

