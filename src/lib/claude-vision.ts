/**
 * Claude Vision API Integration
 *
 * Purpose: Multi-Modal File Upload with Claude Vision API
 * Use cases:
 *   1. Location recognition (Simmerdown PoC): Upload photo -> Identify location & provide directions
 *   2. Passport OCR: Upload passport photo -> Extract structured data for compliance
 *
 * FASE 2.5: Multi-Modal File Upload
 * Date: 2025-10-05
 */

import Anthropic from '@anthropic-ai/sdk'

// Lazy initialization of Anthropic client (performance optimization)
let anthropicClient: Anthropic | null = null

function getAnthropicClient(): Anthropic {
  if (!anthropicClient) {
    anthropicClient = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY!,
    })
  }
  return anthropicClient
}

/**
 * Vision Analysis Result Structure
 */
export interface VisionAnalysisResult {
  description: string
  location?: string
  landmarks?: string[]
  directions?: string
  passportData?: {
    passportNumber?: string
    country?: string
    nationality?: string
    birthdate?: string
    expirationDate?: string
    fullName?: string
  }
  confidence: number
  rawResponse: string
}

/**
 * Analyze image using Claude Vision API (Claude 3.5 Sonnet)
 *
 * @param imageUrl - Public URL of the image to analyze
 * @param prompt - User-provided prompt or question about the image
 * @param analysisType - Type of analysis: 'location' | 'passport' | 'general'
 * @returns VisionAnalysisResult with structured data
 *
 * Performance Target: <2000ms per image analysis
 * Cost: ~$0.005 per image (Claude 3.5 Sonnet pricing)
 */
export async function analyzeImage(
  imageUrl: string,
  prompt: string,
  analysisType: 'location' | 'passport' | 'general' = 'general'
): Promise<VisionAnalysisResult> {
  const anthropic = getAnthropicClient()

  console.log('[claude-vision] Starting image analysis:', {
    url: imageUrl.substring(0, 100),
    analysisType,
    promptLength: prompt.length,
  })

  try {
    // 1. Fetch image and convert to base64
    const imageResponse = await fetch(imageUrl)
    if (!imageResponse.ok) {
      throw new Error(`Failed to fetch image: ${imageResponse.statusText}`)
    }

    const imageBuffer = await imageResponse.arrayBuffer()
    const base64Image = Buffer.from(imageBuffer).toString('base64')
    const mimeType = imageResponse.headers.get('content-type') || 'image/jpeg'

    console.log('[claude-vision] Image fetched:', {
      sizeBytes: imageBuffer.byteLength,
      mimeType,
    })

    // 2. Build specialized prompt based on analysis type
    let systemPrompt = ''

    if (analysisType === 'location') {
      systemPrompt = `Eres un experto en reconocimiento de ubicaciones para Simmerdown Beach Hotel en San Andrés, Colombia.

Analiza la imagen e identifica:
- ¿Dónde fue tomada esta foto? (playa, restaurante, landmark específico)
- Landmarks cercanos o puntos de interés visibles
- Direcciones desde esta ubicación hacia la playa de Simmerdown

Responde en ESPAÑOL, sé conciso y útil. Proporciona información práctica.`
    } else if (analysisType === 'passport') {
      systemPrompt = `Eres un experto en OCR de pasaportes. Extrae TODA la información visible del pasaporte:

Extrae:
- Número de Pasaporte (MRZ - machine readable zone)
- País Emisor (Country of Issue)
- Nacionalidad (Nationality)
- Fecha de Nacimiento (formato: YYYY-MM-DD)
- Fecha de Expiración (formato: YYYY-MM-DD)
- Nombre Completo (exactamente como aparece)

IMPORTANTE:
- Retorna en formato JSON con los campos: passportNumber, country, nationality, birthdate, expirationDate, fullName
- Si un campo no es legible, retorna null para ese campo
- Sé preciso, la información será usada para compliance SIRE/TRA`
    } else {
      systemPrompt = `Eres un asistente visual inteligente. Analiza la imagen y proporciona una descripción detallada de lo que observas.

Enfócate en:
- Elementos principales visibles
- Contexto y ambiente
- Información relevante para el usuario

Responde en ESPAÑOL de manera clara y útil.`
    }

    // 3. Call Claude Vision API
    const message = await anthropic.messages.create({
      model: 'claude-haiku-4-5', // Latest vision-capable model
      max_tokens: 1024,
      temperature: 0.1, // Low temperature for factual extraction
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: mimeType as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp',
                data: base64Image,
              },
            },
            {
              type: 'text',
              text: systemPrompt + '\n\n' + prompt,
            },
          ],
        },
      ],
    })

    const responseText = message.content[0].type === 'text'
      ? message.content[0].text
      : ''

    console.log('[claude-vision] Claude response received:', {
      responseLength: responseText.length,
      usage: message.usage,
    })

    // 4. Parse response based on analysis type
    let result: VisionAnalysisResult = {
      description: responseText,
      confidence: 0.8,
      rawResponse: responseText,
    }

    if (analysisType === 'passport') {
      // Try to parse JSON response for passport data
      try {
        const jsonMatch = responseText.match(/\{[\s\S]*\}/)
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0])
          result.passportData = {
            passportNumber: parsed.passportNumber || parsed.passport_number || null,
            country: parsed.country || parsed.countryOfIssue || null,
            nationality: parsed.nationality || null,
            birthdate: parsed.birthdate || parsed.dateOfBirth || null,
            expirationDate: parsed.expirationDate || parsed.expiration || null,
            fullName: parsed.fullName || parsed.name || null,
          }
          result.confidence = 0.9 // High confidence for structured data
        } else {
          console.warn('[claude-vision] No JSON found in passport response, extracting manually...')
          // Fallback: try to extract from natural language
          result.passportData = extractPassportDataFromText(responseText)
          result.confidence = 0.7
        }
      } catch (e) {
        console.error('[claude-vision] Failed to parse passport JSON:', e)
        result.passportData = extractPassportDataFromText(responseText)
        result.confidence = 0.6
      }
    } else if (analysisType === 'location') {
      // Extract location info from natural language response
      const lines = responseText.split('\n').filter(line => line.trim())
      result.location = lines[0]?.trim() || 'Ubicación no identificada'
      result.confidence = 0.85
    }

    console.log('[claude-vision] Analysis complete:', {
      analysisType,
      confidence: result.confidence,
      hasPassportData: !!result.passportData,
      hasLocation: !!result.location,
    })

    return result
  } catch (error) {
    console.error('[claude-vision] Analysis error:', error)
    throw new Error(`Vision API error: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

/**
 * Helper: Extract passport data from natural language text (fallback)
 */
function extractPassportDataFromText(text: string): VisionAnalysisResult['passportData'] {
  const passportData: VisionAnalysisResult['passportData'] = {}

  // Passport Number (various formats)
  const passportMatch = text.match(/(?:pasaporte|passport)(?:\s+(?:number|número))?[:\s]+([A-Z0-9]{6,12})/i)
  if (passportMatch) passportData.passportNumber = passportMatch[1]

  // Country
  const countryMatch = text.match(/(?:país|country|issued by)[:\s]+([A-Za-z\s]+?)(?:\n|,|\.)/i)
  if (countryMatch) passportData.country = countryMatch[1].trim()

  // Birthdate (YYYY-MM-DD or DD/MM/YYYY)
  const birthdateMatch = text.match(/(?:nacimiento|birth|date of birth)[:\s]+(\d{4}-\d{2}-\d{2}|\d{2}\/\d{2}\/\d{4})/i)
  if (birthdateMatch) passportData.birthdate = birthdateMatch[1]

  // Expiration Date
  const expirationMatch = text.match(/(?:expiración|expiration|expiry)[:\s]+(\d{4}-\d{2}-\d{2}|\d{2}\/\d{2}\/\d{4})/i)
  if (expirationMatch) passportData.expirationDate = expirationMatch[1]

  // Full Name
  const nameMatch = text.match(/(?:nombre|name|full name)[:\s]+([A-Za-z\s]+?)(?:\n|,|pasaporte)/i)
  if (nameMatch) passportData.fullName = nameMatch[1].trim()

  return passportData
}

/**
 * Convenience function: Analyze passport image and extract structured data
 *
 * @param imageUrl - Public URL of passport photo
 * @returns VisionAnalysisResult with passportData field populated
 *
 * Example:
 * ```ts
 * const result = await analyzePassport('https://storage.supabase.co/...')
 * console.log(result.passportData.passportNumber) // "AB1234567"
 * ```
 */
export async function analyzePassport(imageUrl: string): Promise<VisionAnalysisResult> {
  return analyzeImage(
    imageUrl,
    'Extrae toda la información del pasaporte visible en esta imagen. Retorna en formato JSON.',
    'passport'
  )
}

/**
 * Convenience function: Recognize location in image (Simmerdown PoC)
 *
 * @param imageUrl - Public URL of location photo
 * @returns VisionAnalysisResult with location and directions
 *
 * Example:
 * ```ts
 * const result = await recognizeLocation('https://storage.supabase.co/...')
 * console.log(result.location) // "Playa de Spratt Bight"
 * console.log(result.description) // "Camina 10 minutos hacia el norte..."
 * ```
 */
export async function recognizeLocation(imageUrl: string): Promise<VisionAnalysisResult> {
  return analyzeImage(
    imageUrl,
    '¿Dónde fue tomada esta foto? ¿Cómo llego a la playa de Simmerdown desde aquí?',
    'location'
  )
}
