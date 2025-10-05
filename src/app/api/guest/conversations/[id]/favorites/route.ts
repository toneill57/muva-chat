import { NextRequest, NextResponse } from 'next/server'
import { verifyGuestToken } from '@/lib/guest-auth'
import { addToFavorites, removeFromFavorites, getFavorites, type Favorite } from '@/lib/guest-conversation-memory'

/**
 * GET /api/guest/conversations/:id/favorites
 * List all favorites for a conversation
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: conversationId } = await params

    const authHeader = request.headers.get('authorization')
    const token = authHeader?.replace('Bearer ', '')

    if (!token) {
      return NextResponse.json({ error: 'Token requerido' }, { status: 401 })
    }

    const session = await verifyGuestToken(token)
    if (!session) {
      return NextResponse.json({ error: 'Token inválido' }, { status: 401 })
    }

    const favorites = await getFavorites(conversationId)

    return NextResponse.json({ favorites })

  } catch (error) {
    console.error('[favorites] GET error:', error)
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 })
  }
}

/**
 * POST /api/guest/conversations/:id/favorites
 * Add a new favorite to conversation
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: conversationId } = await params

    const authHeader = request.headers.get('authorization')
    const token = authHeader?.replace('Bearer ', '')

    if (!token) {
      return NextResponse.json({ error: 'Token requerido' }, { status: 401 })
    }

    const session = await verifyGuestToken(token)
    if (!session) {
      return NextResponse.json({ error: 'Token inválido' }, { status: 401 })
    }

    const body = await request.json()
    const favorite: Favorite = body.favorite

    if (!favorite || !favorite.type || !favorite.name) {
      return NextResponse.json(
        { error: 'Datos de favorito inválidos' },
        { status: 400 }
      )
    }

    // Validate favorite type
    const validTypes = ['place', 'activity', 'restaurant', 'service', 'event']
    if (!validTypes.includes(favorite.type)) {
      return NextResponse.json(
        { error: 'Tipo de favorito inválido' },
        { status: 400 }
      )
    }

    const result = await addToFavorites(conversationId, favorite)

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Error al agregar favorito' },
        { status: 400 }
      )
    }

    return NextResponse.json({ success: true }, { status: 201 })

  } catch (error) {
    console.error('[favorites] POST error:', error)
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 })
  }
}

/**
 * DELETE /api/guest/conversations/:id/favorites?name=La+Regatta
 * Remove a favorite from conversation
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: conversationId } = await params

    const authHeader = request.headers.get('authorization')
    const token = authHeader?.replace('Bearer ', '')

    if (!token) {
      return NextResponse.json({ error: 'Token requerido' }, { status: 401 })
    }

    const session = await verifyGuestToken(token)
    if (!session) {
      return NextResponse.json({ error: 'Token inválido' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const favoriteName = searchParams.get('name')

    if (!favoriteName) {
      return NextResponse.json(
        { error: 'Nombre de favorito requerido' },
        { status: 400 }
      )
    }

    const result = await removeFromFavorites(conversationId, favoriteName)

    if (!result.success) {
      return NextResponse.json(
        { error: 'Error al eliminar favorito' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('[favorites] DELETE error:', error)
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 })
  }
}
