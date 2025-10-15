/**
 * Standard Amenities Catalog
 *
 * Unified amenity codes for all tenants with multilingual support.
 * Used for efficient searches and consistent UX across the platform.
 */

export interface AmenityTranslation {
  es: string
  en: string
  pt?: string
}

export interface AmenityDefinition extends AmenityTranslation {
  category: AmenityCategory
  searchTerms?: string[] // Additional search keywords
}

export type AmenityCategory =
  | 'connectivity'
  | 'climate'
  | 'kitchen'
  | 'security'
  | 'views'
  | 'entertainment'
  | 'bathroom'
  | 'bedroom'
  | 'accessibility'
  | 'outdoor'
  | 'services'
  | 'general'

/**
 * Master catalog of all amenities with codes and translations
 */
export const AMENITY_CATALOG: Record<string, AmenityDefinition> = {
  // ==================== CONNECTIVITY ====================
  wifi: {
    es: 'WiFi gratuito',
    en: 'Free WiFi',
    pt: 'WiFi grátis',
    category: 'connectivity',
    searchTerms: ['internet', 'wireless']
  },

  // ==================== CLIMATE ====================
  ac: {
    es: 'Aire acondicionado',
    en: 'Air conditioning',
    pt: 'Ar condicionado',
    category: 'climate',
    searchTerms: ['cooling', 'clima']
  },
  heating: {
    es: 'Calefacción',
    en: 'Heating',
    pt: 'Aquecimento',
    category: 'climate'
  },
  fan: {
    es: 'Ventilador',
    en: 'Fan',
    pt: 'Ventilador',
    category: 'climate'
  },

  // ==================== KITCHEN ====================
  full_kitchen: {
    es: 'Cocina equipada',
    en: 'Full kitchen',
    pt: 'Cozinha equipada',
    category: 'kitchen',
    searchTerms: ['cocina completa', 'equipped kitchen']
  },
  kitchenette: {
    es: 'Cocineta',
    en: 'Kitchenette',
    pt: 'Kitchenette',
    category: 'kitchen',
    searchTerms: ['cocineta eléctrica', 'mini kitchen']
  },
  microwave: {
    es: 'Microondas',
    en: 'Microwave',
    pt: 'Micro-ondas',
    category: 'kitchen'
  },
  refrigerator: {
    es: 'Refrigerador',
    en: 'Refrigerator',
    pt: 'Geladeira',
    category: 'kitchen',
    searchTerms: ['nevera', 'fridge']
  },
  gas_oven: {
    es: 'Horno a gas',
    en: 'Gas oven',
    pt: 'Forno a gás',
    category: 'kitchen'
  },
  electric_oven: {
    es: 'Horno eléctrico',
    en: 'Electric oven',
    pt: 'Forno elétrico',
    category: 'kitchen'
  },
  coffee_maker: {
    es: 'Cafetera',
    en: 'Coffee maker',
    pt: 'Cafeteira',
    category: 'kitchen'
  },
  toaster: {
    es: 'Tostadora',
    en: 'Toaster',
    pt: 'Torradeira',
    category: 'kitchen'
  },
  dishwasher: {
    es: 'Lavavajillas',
    en: 'Dishwasher',
    pt: 'Lava-louças',
    category: 'kitchen'
  },

  // ==================== SECURITY ====================
  safe: {
    es: 'Caja fuerte',
    en: 'Safe box',
    pt: 'Cofre',
    category: 'security',
    searchTerms: ['cajilla de seguridad', 'security box']
  },
  keyless_entry: {
    es: 'Acceso sin llave',
    en: 'Keyless entry',
    pt: 'Entrada sem chave',
    category: 'security',
    searchTerms: ['libre de llaves', 'smart lock']
  },
  security_cameras: {
    es: 'Cámaras de seguridad',
    en: 'Security cameras',
    pt: 'Câmeras de segurança',
    category: 'security'
  },
  smoke_detector: {
    es: 'Detector de humo',
    en: 'Smoke detector',
    pt: 'Detector de fumaça',
    category: 'security'
  },

  // ==================== VIEWS ====================
  ocean_view: {
    es: 'Vista al mar',
    en: 'Ocean view',
    pt: 'Vista para o mar',
    category: 'views',
    searchTerms: ['sea view', 'beach view']
  },
  partial_ocean_view: {
    es: 'Vista parcial al mar',
    en: 'Partial ocean view',
    pt: 'Vista parcial para o mar',
    category: 'views'
  },
  garden_view: {
    es: 'Vista al jardín',
    en: 'Garden view',
    pt: 'Vista para o jardim',
    category: 'views'
  },
  street_view: {
    es: 'Vista a la calle',
    en: 'Street view',
    pt: 'Vista para a rua',
    category: 'views'
  },
  no_view: {
    es: 'Sin vista',
    en: 'No view',
    pt: 'Sem vista',
    category: 'views',
    searchTerms: ['interior', 'sin ventana']
  },

  // ==================== ENTERTAINMENT ====================
  tv: {
    es: 'TV',
    en: 'TV',
    pt: 'TV',
    category: 'entertainment',
    searchTerms: ['television', 'televisión']
  },
  smart_tv: {
    es: 'Smart TV',
    en: 'Smart TV',
    pt: 'Smart TV',
    category: 'entertainment'
  },
  cable_tv: {
    es: 'TV por cable',
    en: 'Cable TV',
    pt: 'TV a cabo',
    category: 'entertainment'
  },
  netflix: {
    es: 'Netflix',
    en: 'Netflix',
    pt: 'Netflix',
    category: 'entertainment'
  },

  // ==================== BATHROOM ====================
  hot_water: {
    es: 'Agua caliente',
    en: 'Hot water',
    pt: 'Água quente',
    category: 'bathroom'
  },
  hair_dryer: {
    es: 'Secador de pelo',
    en: 'Hair dryer',
    pt: 'Secador de cabelo',
    category: 'bathroom'
  },
  toiletries: {
    es: 'Artículos de aseo',
    en: 'Toiletries',
    pt: 'Artigos de higiene',
    category: 'bathroom',
    searchTerms: ['shampoo', 'soap', 'jabón']
  },
  bathtub: {
    es: 'Bañera',
    en: 'Bathtub',
    pt: 'Banheira',
    category: 'bathroom'
  },
  private_bathroom: {
    es: 'Baño privado',
    en: 'Private bathroom',
    pt: 'Banheiro privativo',
    category: 'bathroom'
  },

  // ==================== BEDROOM ====================
  king_bed: {
    es: 'Cama king',
    en: 'King bed',
    pt: 'Cama king',
    category: 'bedroom'
  },
  queen_bed: {
    es: 'Cama queen',
    en: 'Queen bed',
    pt: 'Cama queen',
    category: 'bedroom'
  },
  double_bed: {
    es: 'Cama matrimonial',
    en: 'Double bed',
    pt: 'Cama de casal',
    category: 'bedroom',
    searchTerms: ['cama doble']
  },
  single_bed: {
    es: 'Cama sencilla',
    en: 'Single bed',
    pt: 'Cama de solteiro',
    category: 'bedroom',
    searchTerms: ['cama individual']
  },
  bunk_bed: {
    es: 'Litera',
    en: 'Bunk bed',
    pt: 'Beliche',
    category: 'bedroom'
  },
  flexible_beds: {
    es: 'Opciones de camas',
    en: 'Flexible bed options',
    pt: 'Opções de camas',
    category: 'bedroom',
    searchTerms: ['opción de camas', 'configurable beds']
  },
  closet: {
    es: 'Closet',
    en: 'Closet',
    pt: 'Armário',
    category: 'bedroom',
    searchTerms: ['armario', 'wardrobe']
  },

  // ==================== ACCESSIBILITY ====================
  soundproof_windows: {
    es: 'Ventanas acústicas',
    en: 'Soundproof windows',
    pt: 'Janelas acústicas',
    category: 'accessibility',
    searchTerms: ['noise reduction', 'aislamiento acústico']
  },
  wheelchair_accessible: {
    es: 'Accesible para sillas de ruedas',
    en: 'Wheelchair accessible',
    pt: 'Acessível para cadeiras de rodas',
    category: 'accessibility'
  },
  elevator: {
    es: 'Ascensor',
    en: 'Elevator',
    pt: 'Elevador',
    category: 'accessibility'
  },

  // ==================== OUTDOOR ====================
  terrace: {
    es: 'Terraza',
    en: 'Terrace',
    pt: 'Terraço',
    category: 'outdoor'
  },
  balcony: {
    es: 'Balcón',
    en: 'Balcony',
    pt: 'Varanda',
    category: 'outdoor'
  },
  pool: {
    es: 'Piscina',
    en: 'Pool',
    pt: 'Piscina',
    category: 'outdoor'
  },
  garden: {
    es: 'Jardín',
    en: 'Garden',
    pt: 'Jardim',
    category: 'outdoor'
  },
  bbq: {
    es: 'Parrilla',
    en: 'BBQ',
    pt: 'Churrasqueira',
    category: 'outdoor',
    searchTerms: ['barbecue', 'grill']
  },

  // ==================== SERVICES ====================
  parking: {
    es: 'Estacionamiento',
    en: 'Parking',
    pt: 'Estacionamento',
    category: 'services'
  },
  washing_machine: {
    es: 'Lavadora',
    en: 'Washing machine',
    pt: 'Máquina de lavar',
    category: 'services'
  },
  dryer: {
    es: 'Secadora',
    en: 'Dryer',
    pt: 'Secadora',
    category: 'services'
  },
  iron: {
    es: 'Plancha',
    en: 'Iron',
    pt: 'Ferro de passar',
    category: 'services'
  },
  laundry_service: {
    es: 'Servicio de lavandería',
    en: 'Laundry service',
    pt: 'Serviço de lavanderia',
    category: 'services'
  },
  cleaning_service: {
    es: 'Servicio de limpieza',
    en: 'Cleaning service',
    pt: 'Serviço de limpeza',
    category: 'services'
  },
  pet_friendly: {
    es: 'Admite mascotas',
    en: 'Pet friendly',
    pt: 'Aceita animais',
    category: 'services'
  },

  // ==================== GENERAL ====================
  work_desk: {
    es: 'Escritorio',
    en: 'Work desk',
    pt: 'Mesa de trabalho',
    category: 'general'
  },
  luggage_storage: {
    es: 'Guardaequipaje',
    en: 'Luggage storage',
    pt: 'Guarda-volumes',
    category: 'general'
  },
  first_aid_kit: {
    es: 'Botiquín de primeros auxilios',
    en: 'First aid kit',
    pt: 'Kit de primeiros socorros',
    category: 'general'
  },
  fire_extinguisher: {
    es: 'Extintor',
    en: 'Fire extinguisher',
    pt: 'Extintor',
    category: 'general'
  }
}

/**
 * Get amenity label in specified language
 */
export function getAmenityLabel(code: string, lang: 'es' | 'en' | 'pt' = 'es'): string {
  const amenity = AMENITY_CATALOG[code]
  if (!amenity) return code
  return amenity[lang] || amenity.es || code
}

/**
 * Get all amenities by category
 */
export function getAmenitiesByCategory(category: AmenityCategory): Record<string, AmenityDefinition> {
  return Object.entries(AMENITY_CATALOG)
    .filter(([_, amenity]) => amenity.category === category)
    .reduce((acc, [code, amenity]) => ({ ...acc, [code]: amenity }), {})
}

/**
 * Search amenities by text (matches name or search terms in any language)
 */
export function searchAmenities(query: string): string[] {
  const lowerQuery = query.toLowerCase().trim()

  return Object.entries(AMENITY_CATALOG)
    .filter(([code, amenity]) => {
      // Check code
      if (code.toLowerCase().includes(lowerQuery)) return true

      // Check translations
      if (amenity.es.toLowerCase().includes(lowerQuery)) return true
      if (amenity.en.toLowerCase().includes(lowerQuery)) return true
      if (amenity.pt?.toLowerCase().includes(lowerQuery)) return true

      // Check search terms
      if (amenity.searchTerms?.some(term => term.toLowerCase().includes(lowerQuery))) return true

      return false
    })
    .map(([code]) => code)
}

/**
 * Get all available amenity codes
 */
export function getAllAmenityCodes(): string[] {
  return Object.keys(AMENITY_CATALOG)
}

/**
 * Validate if a code exists in catalog
 */
export function isValidAmenityCode(code: string): boolean {
  return code in AMENITY_CATALOG
}
