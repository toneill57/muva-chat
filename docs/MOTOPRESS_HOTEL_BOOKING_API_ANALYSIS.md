# MotoPress Hotel Booking API Analysis & MUVA Migration Mapping

## Executive Summary

This document provides a comprehensive analysis of the MotoPress Hotel Booking plugin's REST API endpoints from https://simmerdown.house and their mapping to MUVA's multi-tenant Matryoshka embeddings architecture. The analysis covers 10 accommodation types with complete booking, pricing, and amenity data structures.

**Key Findings:**
- **10 accommodation types** discovered (9 active, 1 pending)
- **Complete booking system** with availability management
- **Seasonal pricing** with high/low seasons
- **Rich media management** (9 images average per accommodation)
- **Category-based organization** (Apartamentos, Habitaciones privadas)
- **Multi-language support** (Spanish, English, Portuguese-BR)

## API Endpoints Discovered

### Core MotoPress Hotel Booking API (mphb/v1)

#### 1. Accommodation Management
```
GET /mphb/v1/accommodation_types
- Lists all room/accommodation types
- Full CRUD operations supported
- Rich descriptions with HTML content
- Category and attribute management

GET /mphb/v1/accommodations
- Lists accommodation instances
- Links to accommodation types
- Individual room management
```

#### 2. Booking System
```
GET /mphb/v1/bookings
POST /mphb/v1/bookings
- Complete booking lifecycle
- Guest information management
- Service add-ons support
- Multi-currency support (COP primary)
- Status tracking (confirmed, pending, cancelled, etc.)

GET /mphb/v1/bookings/availability
- Real-time availability checking
- Date range queries
- Adult/children capacity filtering
```

#### 3. Pricing & Payments
```
GET /mphb/v1/payments
- Payment tracking and processing
- Gateway integration (manual, woocommerce)
- Billing information management
- Currency support (EUR, USD, COP, etc.)
```

#### 4. Categorization
```
GET /mphb/v1/accommodation_types/categories
- Hierarchical category system
- Capacity-based groupings (1-2, 1-4, 5-10 personas)
- Type-based groupings (Apartamentos, Habitaciones privadas)
```

## Data Structure Analysis

### Accommodation Types Structure
```json
{
  "id": 89,
  "title": "Sunshine",
  "description": "Rich HTML content with images and amenities",
  "excerpt": "Short description",
  "adults": 2,
  "children": 0,
  "total_capacity": 2,
  "base_adults": 2,
  "base_children": 0,
  "bed_type": "Una cama doble",
  "size": 27,
  "view": "",
  "services": [],
  "categories": [
    {"id": 26, "name": "1 - 2 Personas"},
    {"id": 20, "name": "Apartamentos"}
  ],
  "amenities": [],
  "attributes": [
    {
      "id": 10733,
      "title": "Tipo de alojamiento",
      "terms": [{"id": 39, "name": "Apartamento completo"}]
    }
  ],
  "images": [
    {
      "id": 24869,
      "src": "https://simmerdown.house/wp-content/uploads/2021/10/Sunshine.webp",
      "title": "Sunshine",
      "alt": ""
    }
  ]
}
```

### Booking Structure
```json
{
  "id": 32892,
  "status": "confirmed",
  "check_in_date": "2025-09-26",
  "check_out_date": "2025-09-30",
  "check_in_time": "15:00:00",
  "check_out_time": "12:00:00",
  "customer": {
    "first_name": "",
    "last_name": "",
    "email": "",
    "phone": "",
    "country": "",
    "address1": ""
  },
  "reserved_accommodations": [
    {
      "accommodation": 316,
      "accommodation_type": 314,
      "rate": 0,
      "adults": 2,
      "children": 0,
      "guest_name": "",
      "services": [],
      "accommodation_price_per_days": [],
      "fees": [],
      "taxes": {"accommodation": [], "services": [], "fees": []},
      "discount": 0
    }
  ],
  "currency": "COP",
  "total_price": 0
}
```

### Pricing Information (Extracted from Descriptions)
```
Sunshine (ID: 89):
- Low Season: $215,000 COP/night (couple)
- High Season: $235,000 COP/night (couple)
- Minimum stay: 2 nights
- Sunday arrivals restricted

Simmer Highs (ID: 335):
- Low Season: $1,090,000 COP/night
- High Season: $1,190,000 COP/night
- Additional person: $65,000 COP
- Minimum stay: 3 nights

Groovin' (ID: 332):
- Low Season: $195,000 COP/night (couple)
- High Season: $215,000 COP/night (couple)
- Minimum stay: 2 nights
```

### Amenities (Extracted from Descriptions)
Common amenities across accommodations:
- Aire acondicionado (Air conditioning)
- Agua caliente (Hot water)
- Wi-Fi de alta velocidad (High-speed Wi-Fi)
- Smart TV
- Cerradura electrónica (Electronic lock)
- Cocina equipada (Equipped kitchen)
- Cuna para bebé (Baby crib)
- Balcón (Balcony)
- Lavadero (Laundry)

## MUVA Schema Mapping

### 1. Hotels Table Mapping
```sql
-- New table structure needed for MotoPress properties
CREATE TABLE hotels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenant_registry(tenant_id),
  motopress_property_id INTEGER, -- Maps to MotoPress property ID
  name VARCHAR NOT NULL,
  description TEXT,
  address JSONB, -- {street, city, country, postal_code}
  contact_info JSONB, -- {phone, email, website}
  amenities JSONB[], -- Array of amenity objects
  policies JSONB, -- Check-in/out times, restrictions
  images JSONB[], -- Array of image objects
  status VARCHAR DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 2. Accommodation Units Mapping
```sql
CREATE TABLE accommodation_units (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id UUID REFERENCES hotels(id),
  motopress_type_id INTEGER, -- Maps to accommodation_type ID
  motopress_instance_id INTEGER, -- Maps to accommodation ID
  name VARCHAR NOT NULL,
  description TEXT,
  unit_type VARCHAR, -- Maps to categories (Apartamento, Habitacion_privada)
  capacity JSONB, -- {adults: 2, children: 0, total: 2}
  bed_configuration JSONB, -- {bed_type, quantity}
  size_m2 INTEGER,
  floor_number INTEGER,
  view_type VARCHAR,
  status VARCHAR DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 3. Unit Amenities Mapping
```sql
CREATE TABLE unit_amenities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  accommodation_unit_id UUID REFERENCES accommodation_units(id),
  amenity_type VARCHAR, -- Mapped from MotoPress amenity lists
  amenity_name VARCHAR, -- Spanish/English names
  description TEXT,
  is_included BOOLEAN DEFAULT true,
  additional_cost DECIMAL(10,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Standard amenity mapping from MotoPress data:
-- 'air_conditioning' -> 'Aire acondicionado'
-- 'hot_water' -> 'Agua caliente'
-- 'wifi' -> 'Wi-Fi de alta velocidad'
-- 'smart_tv' -> 'Smart TV'
-- 'electronic_lock' -> 'Cerradura electrónica'
-- 'equipped_kitchen' -> 'Cocina equipada'
-- 'baby_crib' -> 'Cuna para bebé'
-- 'balcony' -> 'Balcón'
-- 'laundry' -> 'Lavadero'
```

### 4. Pricing Rules Mapping
```sql
CREATE TABLE pricing_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  accommodation_unit_id UUID REFERENCES accommodation_units(id),
  rule_name VARCHAR, -- 'low_season', 'high_season'
  rule_type VARCHAR, -- 'seasonal', 'daily', 'weekly'
  base_price DECIMAL(10,2),
  currency VARCHAR DEFAULT 'COP',
  additional_person_cost DECIMAL(10,2) DEFAULT 0,
  minimum_stay INTEGER DEFAULT 1,
  maximum_stay INTEGER,
  date_range JSONB, -- {start_date, end_date} for seasonal rules
  day_restrictions JSONB, -- {restricted_days: ['sunday']}
  conditions JSONB, -- Additional pricing conditions
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Example pricing rules from MotoPress data:
-- Sunshine Low Season: base_price=215000, currency='COP', minimum_stay=2
-- Sunshine High Season: base_price=235000, currency='COP', minimum_stay=2
-- Simmer Highs: additional_person_cost=65000
```

### 5. Bookings Integration
```sql
CREATE TABLE bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id UUID REFERENCES hotels(id),
  accommodation_unit_id UUID REFERENCES accommodation_units(id),
  motopress_booking_id INTEGER, -- Reference to original MotoPress booking
  guest_information JSONB,
  check_in_date DATE,
  check_out_date DATE,
  check_in_time TIME DEFAULT '15:00:00',
  check_out_time TIME DEFAULT '12:00:00',
  adults INTEGER,
  children INTEGER DEFAULT 0,
  total_price DECIMAL(10,2),
  currency VARCHAR DEFAULT 'COP',
  booking_status VARCHAR, -- Maps to MotoPress status
  payment_status VARCHAR,
  services JSONB[], -- Additional services booked
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

## Matryoshka Embeddings Integration

### Content Processing Strategy
The accommodation data will be processed through MUVA's Matryoshka embeddings system:

#### Tier 1 (1024 dims - Fast Tourism Searches)
- **Target:** Tourism-related queries about accommodations
- **Content:** Amenity lists, location descriptions, tourism features
- **Search patterns:** "apartamentos en San Andrés", "habitaciones cerca playa"

#### Tier 2 (1536 dims - Balanced Hotel Searches)
- **Target:** General accommodation searches and booking inquiries
- **Content:** Full accommodation descriptions, policies, pricing info
- **Search patterns:** "disponibilidad hotel", "precios habitaciones"

#### Tier 3 (3072 dims - Complex Property Analysis)
- **Target:** Detailed property comparisons and complex queries
- **Content:** Complete HTML descriptions, detailed specifications
- **Search patterns:** Complex multi-criteria searches, property analysis

### Embedding Generation Process
```javascript
// Content preparation for embeddings
const prepareAccommodationContent = (accommodationType) => {
  const tierContent = {
    tier1: extractTourismFeatures(accommodationType), // Amenities, location
    tier2: extractBookingInfo(accommodationType),     // Policies, pricing
    tier3: accommodationType.description              // Full HTML content
  };

  return tierContent;
};

// Integration with existing populate-embeddings.js
const processAccommodationTypes = async (accommodationTypes) => {
  for (const unit of accommodationTypes) {
    const content = prepareAccommodationContent(unit);

    await generateMultiTierEmbeddings({
      content: content.tier3,
      source_file: `motopress_accommodation_${unit.id}`,
      document_type: 'accommodation',
      table: 'muva_content', // Tourism tier for San Andrés content
      tier_content: {
        tier1: content.tier1,
        tier2: content.tier2,
        tier3: content.tier3
      }
    });
  }
};
```

## Migration Plan Recommendations

### Phase 1: Data Migration (Week 1-2)
1. **Schema Setup**
   - Create new hotel and accommodation tables
   - Set up foreign key relationships
   - Create indexes for performance

2. **Data Extract & Transform**
   - Pull all accommodation types via MotoPress API
   - Transform pricing data from HTML descriptions
   - Extract and normalize amenity lists
   - Process image galleries

3. **Multi-tenant Integration**
   - Create tenant entry for Simmer Down property
   - Assign accommodation units to tenant
   - Set up user permissions

### Phase 2: Embeddings Integration (Week 3)
1. **Content Processing**
   - Generate Matryoshka embeddings for all accommodation content
   - Process descriptions through tier routing system
   - Create searchable content chunks

2. **Search Integration**
   - Update search router for accommodation queries
   - Test tier detection with accommodation searches
   - Optimize embedding quality

### Phase 3: Booking System Integration (Week 4)
1. **API Synchronization**
   - Set up real-time sync with MotoPress bookings
   - Implement availability checking
   - Create booking status updates

2. **Testing & Validation**
   - Test search performance across all tiers
   - Validate booking data synchronization
   - Performance optimization

### Critical Migration Considerations

#### 1. Data Volume & Performance
- **10 accommodation types** with rich media (9 images average)
- **Seasonal pricing complexity** requires sophisticated rules engine
- **Multi-language content** needs proper tier routing

#### 2. Real-time Synchronization
- MotoPress API provides real-time booking data
- Availability must stay synchronized
- Consider webhook integration for instant updates

#### 3. Image Asset Management
- **90+ images** need CDN optimization
- WebP format already optimized at source
- Consider local caching strategy

#### 4. Pricing Rule Complexity
- **Seasonal variations** with date ranges
- **Capacity-based pricing** (additional person costs)
- **Minimum stay restrictions** per accommodation
- **Day-of-week restrictions** (Sunday arrivals blocked)

## Technical Implementation Notes

### API Authentication
```bash
# Using Consumer Key/Secret authentication
curl -X GET "https://simmerdown.house/wp-json/mphb/v1/accommodation_types" \
  -u "ck_29a384bbb0500c07159e90b59404293839a33282:cs_8fc58d0a3af6663b3dca2776f54f18d55f2aaea4"
```

### Error Handling
- API returns standard HTTP status codes
- Spanish language error messages
- Rate limiting considerations for bulk data pulls

### Multi-language Support
- WPML language codes: "en", "pt-br", "es"
- Content available in multiple languages
- Consider language-specific embedding generation

## Conclusion

The MotoPress Hotel Booking API provides a comprehensive accommodation management system that maps well to MUVA's multi-tenant architecture. The migration will significantly enhance MUVA's tourism and accommodation search capabilities through the Matryoshka embeddings system.

**Key Success Factors:**
1. **Proper tier routing** for accommodation searches
2. **Pricing rule migration** maintaining seasonal complexity
3. **Real-time booking synchronization** with MotoPress
4. **Multi-language content processing** for embeddings
5. **Performance optimization** for image-heavy content

The integration will position MUVA as a comprehensive hospitality management platform with advanced search capabilities powered by the revolutionary Matryoshka embeddings architecture.

---

*Generated as part of MUVA's API analysis and migration planning documentation.*