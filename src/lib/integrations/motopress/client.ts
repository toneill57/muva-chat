interface MotoPresAccommodation {
  id: number
  title: string  // MotoPress returns plain string
  description?: string  // HTML only (no clean text available)
  excerpt?: string  // Clean text description
  status: string
  // Direct structured fields from MotoPress
  size?: number
  view?: string
  amenities?: string[]
  images?: Array<{
    id: number
    src: string
    title: string
    alt: string
  }>
  // Meta fields (may not all be present)
  meta?: {
    mphb_room_type_id?: number
    mphb_adults?: number
    mphb_children?: number
    mphb_bed_type?: string
    mphb_room_size?: string
    mphb_amenities?: string[]
    mphb_gallery?: string[]
    mphb_price?: number
    mphb_view?: string
    mphb_location?: string
  }
  categories?: Array<{
    id: number
    name: string
  }>
  featured_media?: number
  date?: string
  modified?: string
}

interface MotoPressPriceVariation {
  adults: number
  children: number
  price: number
}

interface MotoPresSeasonPrice {
  priority: number
  season_id: number
  base_price: number
  base_adults: number
  base_children: number
  variations: MotoPressPriceVariation[]
}

interface MotoPresRate {
  id: number  // Rate ID (internal, not for display)
  status: string
  title: string
  description?: string
  accommodation_type_id: number  // Links to accommodation
  season_prices: MotoPresSeasonPrice[]
}

interface MotoPresApiResponse<T> {
  data?: T
  error?: string
  status: number
}

interface ConnectionInfo {
  apiKey: string
  consumerSecret?: string
  siteUrl: string
}

export class MotoPresClient {
  private apiKey: string
  private consumerSecret: string
  private baseUrl: string
  private timeout: number = 30000

  constructor({ apiKey, consumerSecret, siteUrl }: ConnectionInfo) {
    this.apiKey = apiKey
    this.consumerSecret = consumerSecret || 'cs_8fc58d0a3af6663b3dca2776f54f18d55f2aaea4' // Fallback to known working secret
    this.baseUrl = `${siteUrl.replace(/\/$/, '')}/wp-json/mphb/v1`
  }

  private async makeRequest<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<MotoPresApiResponse<T>> {
    const url = `${this.baseUrl}${endpoint}`

    try {
      // Use Basic Auth with Consumer Key and Secret (like test-connection endpoint)
      const credentials = Buffer.from(`${this.apiKey}:${this.consumerSecret}`).toString('base64')

      const response = await fetch(url, {
        ...options,
        headers: {
          'Authorization': `Basic ${credentials}`,
          'Content-Type': 'application/json',
          'User-Agent': 'curl/8.7.1',
          ...options.headers
        },
        signal: AbortSignal.timeout(this.timeout)
      })

      if (!response.ok) {
        const errorText = await response.text()
        return {
          error: `HTTP ${response.status}: ${errorText}`,
          status: response.status
        }
      }

      const data = await response.json()
      return {
        data,
        status: response.status
      }

    } catch (error: any) {
      if (error.name === 'AbortError') {
        return {
          error: 'Request timeout',
          status: 408
        }
      }

      return {
        error: error.message || 'Network error',
        status: 0
      }
    }
  }

  async testConnection(): Promise<{
    success: boolean
    message: string
    accommodationsCount?: number
  }> {
    const response = await this.makeRequest<MotoPresAccommodation[]>('/accommodation_types?per_page=1')

    if (response.error) {
      return {
        success: false,
        message: response.error
      }
    }

    return {
      success: true,
      message: 'Connection successful',
      accommodationsCount: response.data?.length || 0
    }
  }

  async getAccommodations(
    page: number = 1,
    perPage: number = 100
  ): Promise<MotoPresApiResponse<MotoPresAccommodation[]>> {
    return this.makeRequest<MotoPresAccommodation[]>(
      `/accommodation_types?page=${page}&per_page=${perPage}&status=publish`
    )
  }

  async getAccommodation(id: number): Promise<MotoPresApiResponse<MotoPresAccommodation>> {
    return this.makeRequest<MotoPresAccommodation>(`/accommodation_types/${id}`)
  }

  async getAllAccommodations(): Promise<MotoPresApiResponse<MotoPresAccommodation[]>> {
    const allAccommodations: MotoPresAccommodation[] = []
    let page = 1
    let hasMore = true

    while (hasMore) {
      const response = await this.getAccommodations(page, 100)

      if (response.error) {
        return response
      }

      const accommodations = response.data || []
      allAccommodations.push(...accommodations)

      // Si recibimos menos de 100, hemos llegado al final
      hasMore = accommodations.length === 100
      page++

      // Pausa entre requests para no sobrecargar la API
      await new Promise(resolve => setTimeout(resolve, 250))
    }

    return {
      data: allAccommodations,
      status: 200
    }
  }

  async getRoomTypes(): Promise<MotoPresApiResponse<any[]>> {
    return this.makeRequest<any[]>('/room-types')
  }

  async getBookings(
    page: number = 1,
    perPage: number = 100,
    dateFrom?: string,
    dateTo?: string
  ): Promise<MotoPresApiResponse<any[]>> {
    const params = new URLSearchParams()
    params.append('page', page.toString())
    params.append('per_page', perPage.toString())
    if (dateFrom) params.append('date_from', dateFrom)
    if (dateTo) params.append('date_to', dateTo)

    return this.makeRequest<any[]>(`/bookings?${params.toString()}`)
  }

  async getAllBookings(): Promise<MotoPresApiResponse<any[]>> {
    const allBookings: any[] = []
    let page = 1
    let hasMore = true

    while (hasMore) {
      const response = await this.getBookings(page, 100)

      if (response.error) {
        return response
      }

      const bookings = response.data || []
      allBookings.push(...bookings)

      // If we received less than 100, we've reached the end
      hasMore = bookings.length === 100
      page++

      // Pause between requests to avoid overloading the API
      await new Promise(resolve => setTimeout(resolve, 250))
    }

    return {
      data: allBookings,
      status: 200
    }
  }

  /**
   * Get recent bookings (most recent first, limited pages)
   * Uses order=desc to get newest bookings first without slow date_from filter
   *
   * @param maxPages Maximum pages to fetch (default: 3 = ~300 bookings)
   */
  async getRecentBookings(maxPages: number = 3): Promise<MotoPresApiResponse<any[]>> {
    const allBookings: any[] = []
    let page = 1

    console.log(`[MotoPresClient] Fetching recent bookings (order=desc, max ${maxPages} pages)...`)

    while (page <= maxPages) {
      // Use order=desc to get most recent bookings first
      // This is MUCH faster than date_from filter (16s vs infinite)
      const params = new URLSearchParams()
      params.append('page', page.toString())
      params.append('per_page', '100')
      params.append('orderby', 'date')
      params.append('order', 'desc')

      const response = await this.makeRequest<any[]>(`/bookings?${params.toString()}`)

      if (response.error) {
        return response
      }

      const bookings = response.data || []
      allBookings.push(...bookings)

      // Stop if we got less than 100 (no more pages)
      if (bookings.length < 100) {
        break
      }

      page++

      // Pause between requests to avoid overloading the API
      await new Promise(resolve => setTimeout(resolve, 250))
    }

    console.log(`[MotoPresClient] ✅ Fetched ${allBookings.length} recent bookings in ${page} pages`)

    return {
      data: allBookings,
      status: 200
    }
  }

  async getRates(
    page: number = 1,
    perPage: number = 100,
    accommodationTypeId?: number
  ): Promise<MotoPresApiResponse<MotoPresRate[]>> {
    const params = new URLSearchParams()
    params.append('page', page.toString())
    params.append('per_page', perPage.toString())
    if (accommodationTypeId) {
      params.append('accommodation_type_id', accommodationTypeId.toString())
    }

    return this.makeRequest<MotoPresRate[]>(`/rates?${params.toString()}`)
  }

  async getAllRates(): Promise<MotoPresApiResponse<MotoPresRate[]>> {
    const allRates: MotoPresRate[] = []
    let page = 1
    let hasMore = true

    while (hasMore) {
      const response = await this.getRates(page, 100)

      if (response.error) {
        return response
      }

      const rates = response.data || []
      allRates.push(...rates)

      // Si recibimos menos de 100, hemos llegado al final
      hasMore = rates.length === 100
      page++

      // Pausa entre requests para no sobrecargar la API
      await new Promise(resolve => setTimeout(resolve, 250))
    }

    return {
      data: allRates,
      status: 200
    }
  }

  /**
   * Get ALL bookings with _embed parameter for complete data (room names, etc.)
   * This is MUCH SLOWER than getAllBookings() due to _embed parameter
   *
   * Performance: ~2-3 minutes per page (vs seconds without _embed)
   * Use only when you need complete embedded data
   *
   * @param onProgress - Callback for progress updates (current, total, message)
   */
  async getAllBookingsWithEmbed(
    onProgress?: (current: number, total: number, message: string) => void
  ): Promise<MotoPresApiResponse<any[]>> {
    try {
      // Step 1: Detect total bookings via HEAD request
      onProgress?.(0, 0, 'Detecting total bookings...')

      const credentials = Buffer.from(`${this.apiKey}:${this.consumerSecret}`).toString('base64')

      const headResponse = await fetch(`${this.baseUrl}/bookings?per_page=1`, {
        method: 'HEAD',
        headers: {
          'Authorization': `Basic ${credentials}`,
          'User-Agent': 'curl/8.7.1'
        },
        signal: AbortSignal.timeout(this.timeout)
      })

      if (!headResponse.ok) {
        return {
          error: `HTTP ${headResponse.status}: Failed to detect total bookings`,
          status: headResponse.status
        }
      }

      const totalBookings = parseInt(headResponse.headers.get('X-WP-Total') || '0')
      const totalPages = Math.ceil(totalBookings / 100)

      console.log(`[MotoPresClient] Detected ${totalBookings} bookings across ${totalPages} pages`)
      onProgress?.(0, totalPages, `Found ${totalBookings} bookings across ${totalPages} pages`)

      // Step 2: Fetch all pages WITH _embed (SLOW but complete)
      const allBookings: any[] = []

      for (let page = 1; page <= totalPages; page++) {
        const pageStartTime = Date.now()

        // Build URL with _embed parameter
        const params = new URLSearchParams()
        params.append('page', page.toString())
        params.append('per_page', '100')
        params.append('orderby', 'date')
        params.append('order', 'desc')
        params.append('_embed', '1') // This makes it 10x slower but includes room names

        // Retry logic (max 3 attempts)
        let retries = 0
        let pageData: any[] | null = null

        while (retries < 3 && !pageData) {
          try {
            // Longer timeout for _embed requests (120s instead of 30s)
            const response = await fetch(`${this.baseUrl}/bookings?${params.toString()}`, {
              headers: {
                'Authorization': `Basic ${credentials}`,
                'Content-Type': 'application/json',
                'User-Agent': 'curl/8.7.1'
              },
              signal: AbortSignal.timeout(120000) // 120s timeout for _embed
            })

            if (!response.ok) {
              throw new Error(`HTTP ${response.status}`)
            }

            pageData = await response.json()

            // Validate response
            if (!Array.isArray(pageData)) {
              throw new Error('Invalid response format')
            }

          } catch (error: any) {
            retries++
            if (retries < 3) {
              const waitTime = 1000 * retries // Exponential backoff: 1s, 2s, 3s
              console.log(`[MotoPresClient] Retry ${retries}/3 for page ${page} after ${waitTime}ms...`)
              onProgress?.(page - 1, totalPages, `Retry ${retries}/3 for page ${page}...`)
              await new Promise(resolve => setTimeout(resolve, waitTime))
            } else {
              return {
                error: `Failed to fetch page ${page} after 3 attempts: ${error.message}`,
                status: 0
              }
            }
          }
        }

        if (pageData) {
          allBookings.push(...pageData)

          // Calculate progress
          const pageEndTime = Date.now()
          const pageDuration = Math.round((pageEndTime - pageStartTime) / 1000)
          const percentage = Math.round((page / totalPages) * 100)

          // Estimate remaining time
          const remainingPages = totalPages - page
          const estimatedRemaining = remainingPages * pageDuration
          const estimatedMin = Math.floor(estimatedRemaining / 60)
          const estimatedSec = estimatedRemaining % 60

          const progressMessage = `Page ${page}/${totalPages} (${percentage}%) - ${pageDuration}s elapsed${
            remainingPages > 0 ? `, ~${estimatedMin}m ${estimatedSec}s remaining` : ''
          }`

          console.log(`[MotoPresClient] ${progressMessage}`)
          onProgress?.(page, totalPages, progressMessage)

          // Pause between requests (avoid rate limiting)
          if (page < totalPages) {
            await new Promise(resolve => setTimeout(resolve, 250))
          }
        }
      }

      console.log(`[MotoPresClient] ✅ Fetched ${allBookings.length} bookings with embedded data`)

      return {
        data: allBookings,
        status: 200
      }

    } catch (error: any) {
      console.error('[MotoPresClient] getAllBookingsWithEmbed error:', error)
      return {
        error: error.message || 'Failed to fetch bookings with embed',
        status: 0
      }
    }
  }
}