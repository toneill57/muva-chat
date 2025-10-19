import { NextRequest, NextResponse } from 'next/server'
import { verifyGuestToken, extractTokenFromHeader } from '@/lib/guest-auth'
import { createServerClient } from '@/lib/supabase'

/**
 * POST /api/guest/welcome
 *
 * Creates a personalized welcome message for first-time guests
 * Message is FROM the assistant (not user saying "Hola")
 */
export async function POST(request: NextRequest) {
  try {
    // 1. Verify authentication
    const cookieToken = request.cookies.get('guest_token')?.value
    const authHeader = request.headers.get('authorization')
    const headerToken = extractTokenFromHeader(authHeader)
    const token = cookieToken || headerToken

    if (!token) {
      return NextResponse.json(
        { error: 'Token de autenticación requerido' },
        { status: 401 }
      )
    }

    const session = await verifyGuestToken(token)

    if (!session) {
      return NextResponse.json(
        { error: 'Token inválido o expirado' },
        { status: 401 }
      )
    }

    // 2. Parse request body
    const { conversation_id } = await request.json()

    if (!conversation_id) {
      return NextResponse.json(
        { error: 'conversation_id is required' },
        { status: 400 }
      )
    }

    console.log(`[welcome] Generating welcome message for ${session.guest_name}`)

    // 3. Build personalized welcome message
    const checkInFormatted = session.check_in.split('-').reverse().join('/')
    const checkOutFormatted = session.check_out.split('-').reverse().join('/')

    const accommodationUnits = session.accommodation_units || (session.accommodation_unit ? [session.accommodation_unit] : [])

    let accommodationText = ''
    if (accommodationUnits.length === 0) {
      accommodationText = 'Te confirmaré tu alojamiento pronto.'
    } else if (accommodationUnits.length === 1) {
      const unit = accommodationUnits[0]
      const unitNumber = unit.unit_number ? ` #${unit.unit_number}` : ''
      accommodationText = `Estarás hospedándote en **${unit.name}${unitNumber}**`
    } else {
      const unitNames = accommodationUnits.map(u => {
        const number = u.unit_number ? ` #${u.unit_number}` : ''
        return `${u.name}${number}`
      }).join(', ')
      accommodationText = `Estarás hospedándote en **${accommodationUnits.length} alojamientos**: ${unitNames}`
    }

    const welcomeMessage = `¡Hola ${session.guest_name}! 👋 Bienvenid${session.guest_name.endsWith('a') ? 'a' : 'o'} a tu chat personal.

${accommodationText}.

**Tu reserva:**
📅 Check-in: ${checkInFormatted}
📅 Check-out: ${checkOutFormatted}

Estoy aquí para ayudarte con cualquier pregunta sobre:
- 🏨 Tu alojamiento (WiFi, caja fuerte, amenidades)
- 🏝️ Turismo en San Andrés (playas, restaurantes, actividades)
- 📋 Información del hotel

¿En qué puedo ayudarte hoy?`

    // 4. Save message to database
    const supabase = createServerClient()

    const { data: savedMessage, error: saveError } = await supabase
      .from('chat_messages')
      .insert({
        conversation_id,
        role: 'assistant',
        content: welcomeMessage,
        entities: [],
      })
      .select()
      .single()

    if (saveError) {
      console.error('[welcome] Failed to save welcome message:', saveError)
      return NextResponse.json(
        { error: 'Failed to save welcome message' },
        { status: 500 }
      )
    }

    // 5. Update conversation last_message
    await supabase
      .from('guest_conversations')
      .update({
        last_message: welcomeMessage.substring(0, 100),
        updated_at: new Date().toISOString(),
      })
      .eq('id', conversation_id)

    console.log(`[welcome] ✅ Welcome message created for ${session.guest_name}`)

    // 6. Return message
    return NextResponse.json({
      message: {
        id: savedMessage.id,
        role: 'assistant',
        content: welcomeMessage,
        entities: [],
        created_at: savedMessage.created_at,
      },
    })

  } catch (error: any) {
    console.error('[welcome] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
