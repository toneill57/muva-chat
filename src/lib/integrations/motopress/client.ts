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
          'User-Agent': 'InnPilot/1.0',
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
}