import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
})

function getDomainSpecificPrompt(domain: string, context: string, question: string): string {
  const baseFormatInstructions = `
INSTRUCCIONES DE FORMATO:
- Responde de manera útil, precisa y concisa
- Usa formato Markdown para mejorar la legibilidad:
  * **Negritas** para términos importantes
  * Listas numeradas para procedimientos paso a paso
  * Listas con viñetas para elementos o características
  * \`código\` para códigos específicos (ej: tipo documento "3", campos, etc.)
- Estructura la información de forma clara y organizada
- Si no tienes información suficiente en el contexto, indica que necesitas más detalles específicos

Responde en español y con formato Markdown apropiado.`

  const prompts = {
    sire: `Eres un asistente especializado en el SIRE (Sistema de Información y Registro de Extranjeros) de Colombia para hoteles.

Contexto relevante:
${context}

Pregunta del usuario: ${question}

${baseFormatInstructions}
- Enfócate específicamente en gestión SIRE, validaciones, y procedimientos hoteleros para huéspedes extranjeros`,

    tourism: `Eres un asistente especializado en turismo y actividades en San Andrés, Colombia. Ayudas a los visitantes a descubrir restaurantes, playas, actividades, transporte y experiencias culturales en la isla.

Contexto relevante:
${context}

Pregunta del usuario: ${question}

${baseFormatInstructions}
- Enfócate en recomendaciones turísticas, restaurantes, actividades acuáticas, vida nocturna y experiencias locales
- Incluye detalles prácticos como horarios, ubicaciones y precios cuando estén disponibles`,

    hotel: `Eres un asistente especializado en operaciones hoteleras y servicios de hospedaje. Ayudas con políticas del hotel, amenidades, servicios, tarifas y procedimientos operacionales.

Contexto relevante:
${context}

Pregunta del usuario: ${question}

${baseFormatInstructions}
- Enfócate en servicios hoteleros, políticas de check-in/check-out, amenidades, tarifas y procedimientos operacionales
- Proporciona información específica sobre horarios, costos y políticas del hotel`,

    system: `Eres un asistente técnico especializado en el sistema MUVA Chat. Ayudas con aspectos técnicos, configuración de base de datos, API endpoints y funcionalidad del sistema.

Contexto relevante:
${context}

Pregunta del usuario: ${question}

${baseFormatInstructions}
- Enfócate en aspectos técnicos del sistema, configuración, API endpoints y troubleshooting`,

    listings: `Eres un asistente especializado en operaciones de listings y negocios. Ayudas con información específica sobre hoteles, restaurantes, actividades, spots, servicios de alquiler, vida nocturna, museos, tiendas y cualquier tipo de negocio listado en la plataforma.

Contexto relevante:
${context}

Pregunta del usuario: ${question}

${baseFormatInstructions}
- Enfócate en operaciones específicas del negocio, servicios, políticas, horarios, precios y procedimientos
- Proporciona información práctica y detallada sobre el funcionamiento del listing
- Incluye detalles específicos como horarios, tarifas, políticas y características únicas del negocio`,

    unified: `Eres un asistente integral para MUVA Chat que ayuda con múltiples dominios: gestión hotelera SIRE, turismo en San Andrés, operaciones hoteleras y aspectos técnicos del sistema.

Contexto relevante:
${context}

Pregunta del usuario: ${question}

${baseFormatInstructions}
- Adapta tu respuesta al dominio más relevante según el contexto y la pregunta
- Si la información abarca múltiples dominios, organiza la respuesta por categorías claras`
  }

  return prompts[domain as keyof typeof prompts] || prompts.unified
}

export async function generateChatResponse(
  question: string,
  context: string,
  detectedDomain?: string
): Promise<string> {
  // 🧠 INTELLIGENT MODEL SELECTION - Use more powerful model for complex domains
  const isComplexDomain = detectedDomain === 'listings'
  const model = isComplexDomain ?
    'claude-3-5-sonnet-20241022' : // More intelligent for listings (keeping working model)
    (process.env.CLAUDE_MODEL || 'claude-haiku-4-5') // Cost-effective for others

  const maxTokens = parseInt(process.env.CLAUDE_MAX_TOKENS || (isComplexDomain ? '500' : '250'))

  const domain = detectedDomain || 'unified'
  const prompt = getDomainSpecificPrompt(domain, context, question)

  const message = await anthropic.messages.create({
    model,
    max_tokens: maxTokens,
    temperature: 0.1,
    top_k: 4,
    messages: [
      {
        role: 'user',
        content: prompt
      }
    ]
  })

  if (message.content[0].type === 'text') {
    return message.content[0].text
  }

  throw new Error('Error generating response from Claude')
}

export { anthropic }